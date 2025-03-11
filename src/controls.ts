// src/controls.ts - Versão atualizada para movimento contínuo
import { InputState, Vector2D } from './types';
import { GameCamera } from './camera';

export class Controls {
  inputState: InputState;
  canvas: HTMLCanvasElement;
  camera: GameCamera;
  lastSplitTime: number;
  lastEjectTime: number;
  splitCooldown: number;
  ejectCooldown: number;
  touchStartPos: Vector2D | null;

  // MELHORIA: Adicionar variáveis para rastreamento de movimento do mouse
  lastMousePosition: Vector2D;
  mouseVelocity: Vector2D;
  mouseLastMoveTime: number;

  // CORREÇÃO: Adicionar intervalo para envio contínuo de posição
  private mouseUpdateInterval: number | null = null;

  constructor(canvas: HTMLCanvasElement, camera: GameCamera) {
    this.canvas = canvas;
    this.camera = camera;
    this.inputState = {
      mousePosition: { x: 0, y: 0 },
      keys: new Map<string, boolean>()
    };

    this.lastSplitTime = 0;
    this.lastEjectTime = 0;
    this.splitCooldown = 200;
    this.ejectCooldown = 80;
    this.touchStartPos = null;

    this.lastMousePosition = { x: 0, y: 0 };
    this.mouseVelocity = { x: 0, y: 0 };
    this.mouseLastMoveTime = Date.now();

    this.setupEventListeners();

    // CORREÇÃO: Iniciar intervalo para envio contínuo de posição do mouse
    // Usar window.setInterval em vez de setInterval para garantir que o intervalo seja criado corretamente
    this.mouseUpdateInterval = window.setInterval(() => {
      this.sendMousePositionUpdate();
    }, 16); // ~60fps

    // Inicializar com uma posição central
    const centerScreen: Vector2D = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2
    };
    this.inputState.mousePosition = this.camera.screenToWorld(centerScreen);

    // Enviar posição inicial
    this.sendMousePositionUpdate();
  }

  // CORREÇÃO: Método para enviar atualizações de posição do mouse continuamente
  private sendMousePositionUpdate(): void {
    // Despachar um evento personalizado para atualizações contínuas da posição do mouse
    const mouseMoveEvent = new CustomEvent('game-mouse-move', {
      detail: {
        position: this.inputState.mousePosition,
        velocity: this.mouseVelocity,
        isMoving: (Date.now() - this.mouseLastMoveTime) < 100, // Considerado "em movimento" se movido nos últimos 100ms
        isContinuousUpdate: true // Indicar que é uma atualização contínua
      }
    });
    window.dispatchEvent(mouseMoveEvent);
  }

  private setupEventListeners(): void {
    // Evento de movimento do mouse - MELHORADO para rastreamento mais responsivo
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const screenPos: Vector2D = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      // MELHORIA: Calcular velocidade do mouse para movimento preditivo
      const oldMousePos = { ...this.inputState.mousePosition };

      // Converter posição da tela para posição do mundo
      this.inputState.mousePosition = this.camera.screenToWorld(screenPos);

      // Calcular velocidade do mouse
      this.mouseVelocity = {
        x: this.inputState.mousePosition.x - oldMousePos.x,
        y: this.inputState.mousePosition.y - oldMousePos.y
      };

      // Atualizar última posição do mouse e tempo de movimento
      this.lastMousePosition = { ...this.inputState.mousePosition };
      this.mouseLastMoveTime = Date.now();

      // Despachar um evento personalizado para atualizações imediatas da posição do mouse
      const mouseMoveEvent = new CustomEvent('game-mouse-move', {
        detail: {
          position: this.inputState.mousePosition,
          velocity: this.mouseVelocity,
          isMoving: true,
          isContinuousUpdate: false // Indicar que é uma atualização do usuário
        }
      });
      window.dispatchEvent(mouseMoveEvent);
    });

    // Evento de tecla pressionada
    window.addEventListener('keydown', (e) => {
      this.inputState.keys.set(e.key.toLowerCase(), true);

      // Lidar com tecla de espaço para divisão
      if (e.key === ' ' || e.key.toLowerCase() === 'space') {
        const now = Date.now();
        if (now - this.lastSplitTime > this.splitCooldown) {
          this.lastSplitTime = now;
          const splitEvent = new CustomEvent('player-split');
          window.dispatchEvent(splitEvent);
        }
      }

      // Lidar com tecla W para ejetar massa
      if (e.key.toLowerCase() === 'w') {
        const now = Date.now();
        if (now - this.lastEjectTime > this.ejectCooldown) {
          this.lastEjectTime = now;
          const ejectEvent = new CustomEvent('player-eject');
          window.dispatchEvent(ejectEvent);
        }
      }
    });

    // Evento de tecla solta
    window.addEventListener('keyup', (e) => {
      this.inputState.keys.set(e.key.toLowerCase(), false);
    });

    // Eventos de toque para dispositivos móveis - MELHORADO para melhor experiência móvel
    this.canvas.addEventListener('touchstart', (_e) => {
      _e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = _e.touches[0];
      this.touchStartPos = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };

      // Também atualizar posição do mouse no início do toque
      const screenPos: Vector2D = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
      this.inputState.mousePosition = this.camera.screenToWorld(screenPos);
      this.mouseLastMoveTime = Date.now();

      // Despachar evento de movimento do mouse
      this.sendMousePositionUpdate();
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const screenPos: Vector2D = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };

      // MELHORIA: Calcular velocidade do toque para movimento preditivo
      const oldMousePos = { ...this.inputState.mousePosition };

      this.inputState.mousePosition = this.camera.screenToWorld(screenPos);

      // Calcular velocidade do toque
      this.mouseVelocity = {
        x: this.inputState.mousePosition.x - oldMousePos.x,
        y: this.inputState.mousePosition.y - oldMousePos.y
      };

      // Atualizar tempo de movimento
      this.mouseLastMoveTime = Date.now();

      // Despachar evento de movimento do mouse para atualizações imediatas
      this.sendMousePositionUpdate();
    });

    this.canvas.addEventListener('touchend', (_) => { // Use '_' for unused parameter
      //e.preventDefault(); //Comentando para evitar erros

      // Verificar se foi um toque rápido (para divisão)
      if (this.touchStartPos) {
        const now = Date.now();
        if (now - this.lastSplitTime > this.splitCooldown) {
          this.lastSplitTime = now;
          const splitEvent = new CustomEvent('player-split');
          window.dispatchEvent(splitEvent);
        }
        this.touchStartPos = null;
      }
    });

    // Toque duplo para ejetar massa
    let lastTap = 0;
    this.canvas.addEventListener('touchend', (_) => { // Use '_' for unused parameter
      const now = Date.now();
      const doubleTapDelay = 300;
      if (now - lastTap < doubleTapDelay) {
        // Toque duplo detectado
        if (now - this.lastEjectTime > this.ejectCooldown) {
          this.lastEjectTime = now;
          const ejectEvent = new CustomEvent('player-eject');
          window.dispatchEvent(ejectEvent);
        }
      }
      lastTap = now;
    });

    // Prevenir menu de contexto no clique direito
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Adicionar listener para redimensionamento da janela para atualizar posição do mouse
    window.addEventListener('resize', () => {
      // Redefinir posição do mouse no redimensionamento para evitar problemas
      const centerScreen: Vector2D = {
        x: this.canvas.width / 2,
        y: this.canvas.height / 2
      };
      this.inputState.mousePosition = this.camera.screenToWorld(centerScreen);
    });

    // MELHORIA: Adicionar suporte para clique direito para ejetar massa
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) { // Clique direito
        const now = Date.now();
        if (now - this.lastEjectTime > this.ejectCooldown) {
          this.lastEjectTime = now;
          const ejectEvent = new CustomEvent('player-eject');
          window.dispatchEvent(ejectEvent);
        }
      }
    });
  }

  isKeyPressed(key: string): boolean {
    return this.inputState.keys.get(key.toLowerCase()) === true;
  }

  getMousePosition(): Vector2D {
    // Retornar uma cópia para evitar problemas de referência
    return {
      x: this.inputState.mousePosition.x,
      y: this.inputState.mousePosition.y
    };
  }

  // MELHORIA: Adicionar método para obter velocidade do mouse
  getMouseVelocity(): Vector2D {
    return { ...this.mouseVelocity };
  }

  // MELHORIA: Verificar se o mouse está no centro da tela
  isMouseInCenter(): boolean {
    const centerWorld = this.camera.screenToWorld({
      x: this.canvas.width / 2,
      y: this.canvas.height / 2
    });

    const distToCenter = Math.sqrt(
      Math.pow(this.inputState.mousePosition.x - centerWorld.x, 2) +
      Math.pow(this.inputState.mousePosition.y - centerWorld.y, 2)
    );

    // Considerar "no centro" se estiver dentro de um raio de 50 unidades do mundo
    return distToCenter < 50;
  }

  update(): void {
    // Verificar divisão (espaço)
    if (this.isKeyPressed(' ') || this.isKeyPressed('space')) {
      const now = Date.now();
      if (now - this.lastSplitTime > this.splitCooldown) {
        this.lastSplitTime = now;

        // Despachar um evento personalizado para divisão
        const splitEvent = new CustomEvent('player-split');
        window.dispatchEvent(splitEvent);

        // Redefinir a tecla para evitar divisão contínua
        this.inputState.keys.set(' ', false);
        this.inputState.keys.set('space', false);
      }
    }

    // Verificar ejeção de massa (w)
    if (this.isKeyPressed('w')) {
      const now = Date.now();
      if (now - this.lastEjectTime > this.ejectCooldown) {
        this.lastEjectTime = now;

        // Despachar um evento personalizado para ejetar massa
        const ejectEvent = new CustomEvent('player-eject');
        window.dispatchEvent(ejectEvent);

        // Redefinir a tecla para evitar ejeção contínua
        this.inputState.keys.set('w', false);
      }
    }

    // MELHORIA: Adicionar suporte para teclas WASD para movimento alternativo
    const moveKeys = {
      w: { x: 0, y: -1 },
      a: { x: -1, y: 0 },
      s: { x: 0, y: 1 },
      d: { x: 1, y: 0 }
    };

    let keyboardDirection = { x: 0, y: 0 };

    // Verificar teclas WASD
    for (const [key, dir] of Object.entries(moveKeys)) {
      if (this.isKeyPressed(key)) {
        keyboardDirection.x += dir.x;
        keyboardDirection.y += dir.y;
      }
    }

    // Se houver movimento de teclado, atualizar posição do mouse
    if (keyboardDirection.x !== 0 || keyboardDirection.y !== 0) {
      // Normalizar direção
      const mag = Math.sqrt(keyboardDirection.x * keyboardDirection.x + keyboardDirection.y * keyboardDirection.y);
      if (mag > 0) {
        keyboardDirection.x /= mag;
        keyboardDirection.y /= mag;
      }

      // Calcular nova posição do mouse baseada na posição atual da câmera
      const cameraPos = this.camera.position;
      const moveDistance = 200; // Distância de movimento

      const newMousePos = {
        x: cameraPos.x + keyboardDirection.x * moveDistance,
        y: cameraPos.y + keyboardDirection.y * moveDistance
      };

      // Atualizar posição do mouse
      this.inputState.mousePosition = newMousePos;
      this.mouseLastMoveTime = Date.now();

      // Despachar evento de movimento do mouse
      this.sendMousePositionUpdate();
    }
  }

  // CORREÇÃO: Adicionar método para limpar o intervalo quando não for mais necessário
  cleanup(): void {
    if (this.mouseUpdateInterval !== null) {
      window.clearInterval(this.mouseUpdateInterval);
      this.mouseUpdateInterval = null;
    }
  }
}
