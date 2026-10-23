/**
 * VITRAIL: Stained Glass Tetris Roguelite
 * Input Handler: DAS / ARR Engine, Keybinding, Gamepad Polling
 */

import { BOARD_WIDTH } from '../core/constants';
import { GameSettings } from '../core/types';

export type InputAction =
  | 'softDrop'
  | 'hardDrop'
  | 'rotateCW'
  | 'rotateCCW'
  | 'rotate180'
  | 'hold'
  | 'pause'
  | 'restart'
  | 'toggleFps'
  | 'toggleMute'
  | 'openSettings'
  | 'pickRelic1'
  | 'pickRelic2'
  | 'pickRelic3';

export class InputHandler {
  public settings: GameSettings;
  public dasModifier = 0;
  private keyStates: Map<string, boolean> = new Map();

  private horizontalShift = 0;
  private gamepadSoftDrop = false;

  // DAS / ARR state
  private activeMoveDirection: 'left' | 'right' | null = null;
  private dasTimer = 0;
  private arrTimer = 0;
  private cutTimer = 0;

  // Key repeat prevention for instant actions
  private pressedActions: Set<InputAction> = new Set();
  private consumedActions: Set<InputAction> = new Set();

  // Gamepad state
  private lastGamepadButtons: boolean[] = [];

  constructor(settings: GameSettings) {
    this.settings = settings;
    this.setupListeners();
    window.addEventListener('blur', () => this.reset());
  }

  private setupListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input, select, textarea')) return;
      if ((e.target as HTMLElement)?.closest?.('button') && ['Space', 'Enter'].includes(e.code)) return;
      // Prevent browser scroll on game keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.repeat || this.isKeyDown(e.code)) return;
      this.keyStates.set(e.code, true);

      // Trigger instant one-shot actions on keydown
      const action = this.mapCodeToAction(e.code);
      if (action && !this.consumedActions.has(action)) {
        this.pressedActions.add(action);
        this.consumedActions.add(action);
      }

      // Handle DAS directional press start
      if (e.code === 'ArrowLeft' || e.code === 'KeyJ') {
        this.startMove('left');
      } else if (e.code === 'ArrowRight' || e.code === 'KeyL') {
        this.startMove('right');
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keyStates.set(e.code, false);

      const action = this.mapCodeToAction(e.code);
      if (action) {
        this.consumedActions.delete(action);
      }

      // Stop move direction if corresponding key released
      if ((e.code === 'ArrowLeft' || e.code === 'KeyJ') && this.activeMoveDirection === 'left') {
        if (this.isKeyDown('ArrowRight') || this.isKeyDown('KeyL')) {
          this.startMove('right');
        } else {
          this.activeMoveDirection = null;
        }
      } else if ((e.code === 'ArrowRight' || e.code === 'KeyL') && this.activeMoveDirection === 'right') {
        if (this.isKeyDown('ArrowLeft') || this.isKeyDown('KeyJ')) {
          this.startMove('left');
        } else {
          this.activeMoveDirection = null;
        }
      }
    });
  }

  public reset(): void {
    this.keyStates.clear();
    this.horizontalShift = 0;
    this.gamepadSoftDrop = false;
    this.pressedActions.clear();
    this.consumedActions.clear();
    this.activeMoveDirection = null;
    this.dasTimer = 0;
    this.arrTimer = 0;
    this.cutTimer = 0;
  }

  private isKeyDown(code: string): boolean {
    return !!this.keyStates.get(code);
  }

  private startMove(dir: 'left' | 'right'): void {
    const preserve = this.activeMoveDirection !== null && this.activeMoveDirection !== dir && this.settings.cancelDas === false;
    this.activeMoveDirection = dir;
    if (!preserve) {
      this.dasTimer = 0;
      this.arrTimer = 0;
    }
    this.cutTimer = 0;
    // Initial tap shift immediately
    this.horizontalShift = dir === 'left' ? -1 : 1;
  }

  public delayAutoShift(): void {
    this.cutTimer = Math.max(0, this.settings.dcd ?? 0);
    this.horizontalShift = 0;
  }

  public initialActions(): { hold: boolean; rotation: 'cw' | 'ccw' | '180' | null } {
    return {
      hold: this.isKeyDown('KeyC') || this.isKeyDown('ShiftLeft') || this.isKeyDown('ShiftRight'),
      rotation: this.isKeyDown('KeyA') ? '180' : this.isKeyDown('KeyZ') || this.isKeyDown('ControlLeft') || this.isKeyDown('ControlRight') ? 'ccw' : this.isKeyDown('ArrowUp') || this.isKeyDown('KeyX') ? 'cw' : null
    };
  }

  private mapCodeToAction(code: string): InputAction | null {
    switch (code) {
      case 'ArrowUp':
      case 'KeyX':
        return 'rotateCW';
      case 'KeyZ':
      case 'ControlLeft':
      case 'ControlRight':
        return 'rotateCCW';
      case 'KeyA':
        return 'rotate180';
      case 'Space':
        return 'hardDrop';
      case 'KeyC':
      case 'ShiftLeft':
      case 'ShiftRight':
        return 'hold';
      case 'Escape':
      case 'KeyP':
        return 'pause';
      case 'KeyR':
        return 'restart';
      case 'KeyF':
        return 'toggleFps';
      case 'KeyM':
        return 'toggleMute';
      case 'KeyO':
        return 'openSettings';
      case 'Digit1':
      case 'Numpad1':
        return 'pickRelic1';
      case 'Digit2':
      case 'Numpad2':
        return 'pickRelic2';
      case 'Digit3':
      case 'Numpad3':
        return 'pickRelic3';
      default:
        return null;
    }
  }

  /**
   * Called on every 60 Hz logic tick to update DAS / ARR and gamepad
   */
  public update(dtMs: number): void {
    // 1. Update Gamepad inputs
    this.pollGamepad();

    if (!this.activeMoveDirection) return;
    if (this.cutTimer > 0) {
      const blocked = Math.min(this.cutTimer, dtMs);
      this.cutTimer -= blocked;
      dtMs -= blocked;
      if (dtMs <= 0) return;
    }
    const direction = this.activeMoveDirection === 'left' ? -1 : 1;
    const previous = this.dasTimer;
    this.dasTimer += dtMs;
    const das = this.settings.das + this.dasModifier;
    if (this.dasTimer < das) return;
    if (this.settings.arr === 0) {
      this.horizontalShift = direction * BOARD_WIDTH;
      return;
    }
    const firstRepeat = previous < das ? 1 : 0;
    this.arrTimer += this.dasTimer - Math.max(previous, das);
    const repeats = Math.floor(this.arrTimer / this.settings.arr);
    this.arrTimer %= this.settings.arr;
    this.horizontalShift += direction * (firstRepeat + repeats);
    this.horizontalShift = Math.max(-BOARD_WIDTH, Math.min(BOARD_WIDTH, this.horizontalShift));
  }

  public consumeHorizontalShift(): number {
    const shift = this.horizontalShift;
    this.horizontalShift = 0;
    return shift;
  }

  public isSoftDropActive(): boolean {
    return this.gamepadSoftDrop || this.isKeyDown('ArrowDown') || this.isKeyDown('KeyK');
  }

  /**
   * Consumes and returns true if an action was triggered
   */
  public consumeAction(action: InputAction): boolean {
    if (this.pressedActions.has(action)) {
      this.pressedActions.delete(action);
      return true;
    }
    return false;
  }

  public clearActions(): void {
    this.pressedActions.clear();
    this.horizontalShift = 0;
  }

  private pollGamepad(): void {
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    if (!gamepads || !gamepads[0]) {
      this.gamepadSoftDrop = false;
      if (this.lastGamepadButtons[14] || this.lastGamepadButtons[15]) this.activeMoveDirection = null;
      this.lastGamepadButtons = [];
      return;
    }

    const pad = gamepads[0];
    const buttons = pad.buttons.map(b => b.pressed);
    this.gamepadSoftDrop = !!buttons[13];

    const checkButtonDown = (idx: number, action: InputAction) => {
      if (buttons[idx] && !this.lastGamepadButtons[idx]) {
        this.pressedActions.add(action);
      }
    };

    // Standard Gamepad Mapping:
    // 0: A (Rotate CW)
    // 1: B (Rotate CCW)
    // 2: X (Rotate 180)
    // 3: Y (Hold)
    // 4: LB (Hold)
    // 5: RB (Hard Drop)
    // 9: Start (Pause)
    // 12: Dpad Up (Hard Drop)
    // 13: Dpad Down (Soft Drop)
    // 14: Dpad Left
    // 15: Dpad Right

    checkButtonDown(0, 'rotateCW');
    checkButtonDown(1, 'rotateCCW');
    checkButtonDown(2, 'rotate180');
    checkButtonDown(3, 'hold');
    checkButtonDown(4, 'hold');
    checkButtonDown(5, 'hardDrop');
    checkButtonDown(9, 'pause');
    checkButtonDown(12, 'hardDrop');

    // D-Pad left/right DAS simulation
    if (buttons[14] && !this.lastGamepadButtons[14]) this.startMove('left');
    if (buttons[15] && !this.lastGamepadButtons[15]) this.startMove('right');
    if (!buttons[14] && this.lastGamepadButtons[14] && this.activeMoveDirection === 'left') this.activeMoveDirection = null;
    if (!buttons[15] && this.lastGamepadButtons[15] && this.activeMoveDirection === 'right') this.activeMoveDirection = null;

    this.lastGamepadButtons = buttons;
  }
}
