// src/camera.ts - Versão melhorada para seguimento mais responsivo
import { Camera, Vector2D } from './types';
import { lerp } from './utils';

export class GameCamera implements Camera {
  position: Vector2D;
  targetPosition: Vector2D;
  scale: number;
  targetScale: number;
  width: number;
  height: number;
  minScale: number;
  maxScale: number;
  smoothFactor: number;
  
  constructor(width: number, height: number) {
    this.position = { x: 0, y: 0 };
    this.targetPosition = { x: 0, y: 0 };
    this.scale = 1;
    this.targetScale = 1;
    this.width = width;
    this.height = height;
    this.minScale = 0.1;  // Nível mínimo de zoom
    this.maxScale = 2.0;  // Nível máximo de zoom
    // MELHORIA: Fator de suavização muito mais alto para movimento quase instantâneo da câmera
    this.smoothFactor = 0.8; // Aumentado de 0.5 para 0.8 para movimento quase instantâneo
  }

  update(deltaTime: number): void {
    // Verificação de segurança para deltaTime
    if (typeof deltaTime !== 'number' || deltaTime <= 0 || deltaTime > 1) {
      deltaTime = 0.016; // Padrão para 60fps
    }
    
    // MELHORIA: Movimento de câmera muito mais rápido com fator de lerp mais alto
    // Ajustar fator de lerp com base em deltaTime para suavidade consistente
    const lerpFactor = 1 - Math.pow(1 - this.smoothFactor, deltaTime * 60);
    
    // MELHORIA: Usar um fator de lerp ainda mais alto para a posição para seguimento quase instantâneo
    const positionLerpFactor = Math.min(0.95, lerpFactor * 1.5); // Mais rápido para posição
    
    this.position.x = lerp(this.position.x, this.targetPosition.x, positionLerpFactor);
    this.position.y = lerp(this.position.y, this.targetPosition.y, positionLerpFactor);
    this.scale = lerp(this.scale, this.targetScale, lerpFactor);
    
    // Validar posição para evitar NaN
    if (isNaN(this.position.x) || isNaN(this.position.y)) {
      console.error("Posição da câmera é NaN, redefinindo");
      this.position = { ...this.targetPosition };
    }
    
    if (isNaN(this.scale)) {
      console.error("Escala da câmera é NaN, redefinindo");
      this.scale = this.targetScale;
    }
    
    // Limitar escala aos valores mín/máx
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale));
  }

  follow(target: Vector2D, playerRadius: number): void {
    // Verificação de segurança para o alvo
    if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') {
      return;
    }
    
    // MELHORIA: Usar posição alvo diretamente para seguimento mais responsivo
    this.targetPosition = { ...target };
    
    // Escala baseada no tamanho do jogador (afastar à medida que o jogador fica maior)
    // Fórmula ajustada para melhor visibilidade
    const baseScale = 1;
    // MELHORIA: Ajuste de escala mais suave para melhor visibilidade
    const scaleFactor = Math.max(0.4, 50 / (playerRadius + 50));
    this.targetScale = baseScale * scaleFactor;
    
    // Limitar escala alvo aos valores mín/máx
    this.targetScale = Math.max(this.minScale, Math.min(this.maxScale, this.targetScale));
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  worldToScreen(worldPos: Vector2D): Vector2D {
    // Verificação de segurança para worldPos
    if (!worldPos || typeof worldPos.x !== 'number' || typeof worldPos.y !== 'number') {
      return { x: 0, y: 0 };
    }
    
    return {
      x: (worldPos.x - this.position.x) * this.scale + this.width / 2,
      y: (worldPos.y - this.position.y) * this.scale + this.height / 2
    };
  }

  screenToWorld(screenPos: Vector2D): Vector2D {
    // Verificação de segurança para screenPos
    if (!screenPos || typeof screenPos.x !== 'number' || typeof screenPos.y !== 'number') {
      return { x: 0, y: 0 };
    }
    
    return {
      x: (screenPos.x - this.width / 2) / this.scale + this.position.x,
      y: (screenPos.y - this.height / 2) / this.scale + this.position.y
    };
  }

  isInView(worldPos: Vector2D, radius: number): boolean {
    // Verificação de segurança para worldPos e radius
    if (!worldPos || typeof worldPos.x !== 'number' || typeof worldPos.y !== 'number' || 
        typeof radius !== 'number') {
      return false;
    }
    
    const screenPos = this.worldToScreen(worldPos);
    const scaledRadius = radius * this.scale;
    
    // Adicionar uma margem para evitar pop-in/pop-out nas bordas da tela
    const margin = 100;
    
    return (
      screenPos.x + scaledRadius >= -margin &&
      screenPos.x - scaledRadius <= this.width + margin &&
      screenPos.y + scaledRadius >= -margin &&
      screenPos.y - scaledRadius <= this.height + margin
    );
  }
}
