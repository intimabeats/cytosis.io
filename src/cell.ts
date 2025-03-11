// src/cell.ts - Versão melhorada para física mais responsiva
import { Cell, Vector2D, Camera } from './types';
import {
  generateId,
  generateMembranePoints,
  lerpVector,
  validatePosition,
  distance,
  normalize,
  subtract,
  magnitude
} from './utils';

export class BaseCell implements Cell {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  mass: number;
  color: string;
  membranePoints: Vector2D[];
  membraneTargetPoints: Vector2D[];
  membraneNoiseTime: number;
  membraneNoiseSpeed: number;
  friction: number;
  lastUpdateTime: number;
  elasticity: number;
  pulseEffect: number;
  pulseDirection: number;
  pulseSpeed: number;

  // MELHORIA: Adicionar variáveis para física melhorada
  maxSpeed: number;
  acceleration: Vector2D;
  damping: number;

  constructor(position: Vector2D, radius: number, color: string) {
    this.id = generateId();
    this.position = { ...position };
    this.velocity = { x: 0, y: 0 };
    this.radius = radius;
    this.mass = Math.PI * radius * radius;
    this.color = color;

    // MELHORIA: Inicializar variáveis de física
    this.maxSpeed = 1000; // Velocidade máxima muito maior
    this.acceleration = { x: 0, y: 0 };
    this.damping = 0.92; // Amortecimento para movimento mais suave

    // Propriedades da membrana - garantir inicialização adequada
    const numPoints = Math.max(10, Math.floor(radius * 0.8));
    try {
      this.membranePoints = generateMembranePoints(this.position, this.radius, numPoints);
      this.membraneTargetPoints = JSON.parse(JSON.stringify(this.membranePoints)); // Cópia profunda
        //LOGS
        console.log("BaseCell constructor - membranePoints:", this.membranePoints);
        console.log("BaseCell constructor - membraneTargetPoints:", this.membraneTargetPoints);
    } catch (error) {
      console.error("Erro ao inicializar pontos da membrana:", error);
      // Fallback para pontos simples
      this.membranePoints = [];
      this.membraneTargetPoints = [];
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const x = this.position.x + Math.cos(angle) * this.radius;
        const y = this.position.y + Math.sin(angle) * this.radius;
        this.membranePoints.push({ x, y });
        this.membraneTargetPoints.push({ x, y });
      }
    }

    this.membraneNoiseTime = 0;
    this.membraneNoiseSpeed = 0.5;
    // MELHORIA: Fricção EXTREMAMENTE REDUZIDA para movimento quase instantâneo
    this.friction = 0.0005; // Reduzido ainda mais para movimento mais responsivo
    this.lastUpdateTime = Date.now();

    // Efeitos visuais
    this.elasticity = 0.3; // Quanto a célula se estica ao se mover
    this.pulseEffect = 0;
    this.pulseDirection = 1;
    this.pulseSpeed = 0.5 + Math.random() * 0.5;
  }


update(deltaTime: number): void {
    // Verificação de segurança para deltaTime
    if (typeof deltaTime !== 'number' || deltaTime <= 0 || deltaTime > 1) {
        const now = Date.now();
        deltaTime = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;

        // Ainda precisa de um deltaTime válido
        if (deltaTime <= 0 || deltaTime > 1) {
            deltaTime = 0.016; // Padrão para 60fps
        }
    } else {
        this.lastUpdateTime = Date.now();
    }

    // Fricção e Amortecimento (mantidos baixos)
    this.friction = 0.0001; // Quase sem fricção
    this.velocity.x += this.acceleration.x * deltaTime;
    this.velocity.y += this.acceleration.y * deltaTime;
    this.velocity.x *= this.damping || 0.98;
    this.velocity.y *= this.damping || 0.98;
    this.velocity.x *= (1 - this.friction * deltaTime);
    this.velocity.y *= (1 - this.friction * deltaTime);

    // NOVO: Velocidade máxima e mínima fixas (ajuste esses valores)
    const minSpeed = 200;  // Velocidade mínima absoluta
    const maxSpeed = 400; // Velocidade máxima absoluta

    // Limitar a velocidade
    const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    if (currentSpeed > maxSpeed) {
        const scale = maxSpeed / currentSpeed;
        this.velocity.x *= scale;
        this.velocity.y *= scale;
    } else if (currentSpeed < minSpeed) {
        // Aumentar a velocidade se estiver abaixo da mínima (e se movendo)
        if (currentSpeed > 0) { // Evita divisão por zero
            const scale = minSpeed / currentSpeed;
            this.velocity.x *= scale;
            this.velocity.y *= scale;
        }
    }

    // Redefinir aceleração ANTES de atualizar a posição e a membrana
    this.acceleration = { x: 0, y: 0 };

    // Atualizar posição (mantido)
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Validar posição (mantido)
    const defaultPos = { x: 0, y: 0 };
    this.position = validatePosition(this.position, defaultPos);

    // Atualizar membrana - garantir que membranePoints e membraneTargetPoints estejam inicializados
    if (!this.membranePoints || !this.membraneTargetPoints ||
        !Array.isArray(this.membranePoints) || !Array.isArray(this.membraneTargetPoints)) {
        const numPoints = Math.max(10, Math.floor(this.radius * 0.8));
        this.membranePoints = generateMembranePoints(this.position, this.radius, numPoints);
        this.membraneTargetPoints = [...this.membranePoints];
    }

    this.membraneNoiseTime += deltaTime * this.membraneNoiseSpeed;
    this.updateMembranePoints();

    // Atualizar efeito de pulso
    this.updatePulseEffect(deltaTime);
}


  updatePulseEffect(deltaTime: number): void {
    // Atualizar animação de pulso
    this.pulseEffect += this.pulseDirection * this.pulseSpeed * deltaTime;

    if (this.pulseEffect > 1) {
      this.pulseEffect = 1;
      this.pulseDirection = -1;
    } else if (this.pulseEffect < 0) {
      this.pulseEffect = 0;
      this.pulseDirection = 1;
    }
  }

  updateMembranePoints(): void {
    // Verificação de segurança para pontos da membrana
    if (!this.membranePoints || !this.membraneTargetPoints ||
        !Array.isArray(this.membranePoints) || !Array.isArray(this.membraneTargetPoints)) {
      const numPoints = Math.max(10, Math.floor(this.radius * 0.8));
      this.membranePoints = generateMembranePoints(this.position, this.radius, numPoints);
      this.membraneTargetPoints = [...this.membranePoints];
      return;
    }

    const numPoints = this.membranePoints.length;

    // Calcular magnitude da velocidade para efeito de estiramento
    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    // MELHORIA: Aumentar fator de estiramento para feedback visual melhor
    const stretchFactor = Math.min(0.5, speed * 0.002); // Aumentado para feedback visual melhor

    // Calcular direção de estiramento
    let stretchX = 0;
    let stretchY = 0;

    if (speed > 0) {
      stretchX = this.velocity.x / speed;
      stretchY = this.velocity.y / speed;
    }

    // Gerar NOVOS pontos alvo com base na posição ATUALIZADA
    const newTargetPoints: Vector2D[] = [];
    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;

        // Efeito de ruído básico
        const noise = Math.sin(angle * 3 + this.membraneNoiseTime) * 0.1 + 0.9;

        // Efeito de pulso
        const pulseNoise = 1 + (this.pulseEffect * 0.05);

        // Efeito de estiramento baseado na velocidade
        const stretch = 1 + stretchFactor * Math.cos(angle - Math.atan2(stretchY, stretchX)) * this.elasticity;

        // Combinar efeitos
        const totalEffect = noise * pulseNoise * stretch;

        // Usar a posição ATUALIZADA da célula
        const x = this.position.x + Math.cos(angle) * this.radius * totalEffect;
        const y = this.position.y + Math.sin(angle) * this.radius * totalEffect;

        newTargetPoints.push({ x, y });
    }


    // Interpolar entre os pontos ATUAIS e os NOVOS pontos alvo
    for (let i = 0; i < numPoints; i++) {
      this.membranePoints[i] = lerpVector(
        this.membranePoints[i],
        newTargetPoints[i], // Usar os novos pontos alvo
        0.5 // Aumentado de 0.3 para 0.5 para resposta mais rápida
      );
    }

    // Atualizar membraneTargetPoints para os novos pontos alvo.  Isso é importante
    // para que, no próximo quadro, a interpolação comece a partir do ponto correto.
    this.membraneTargetPoints = newTargetPoints;
    console.log("updateMembranePoints - membranePoints (após interpolação):", this.membranePoints); // LOG
}


  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    // Verificação de segurança para câmera
    if (!camera) {
      return;
    }

    if (!camera.isInView(this.position, this.radius * 1.2)) return;

    const screenPos = camera.worldToScreen(this.position);
    const screenRadius = this.radius * camera.scale;

    // Desenhar membrana da célula (borda externa)
    ctx.beginPath();

    // Verificação de segurança para pontos da membrana
    if (!this.membranePoints || this.membranePoints.length === 0) {
      // Fallback para círculo simples se os pontos da membrana estiverem faltando
      ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
    } else {
      const screenMembranePoints = this.membranePoints.map(p => camera.worldToScreen(p));

      ctx.moveTo(screenMembranePoints[0].x, screenMembranePoints[0].y);
      for (let i = 1; i < screenMembranePoints.length; i++) {
        ctx.lineTo(screenMembranePoints[i].x, screenMembranePoints[i].y);
      }
      ctx.closePath();
    }

    // Preencher com gradiente
    try {
      const gradient = ctx.createRadialGradient(
        screenPos.x, screenPos.y, 0,
        screenPos.x, screenPos.y, screenRadius
      );
      gradient.addColorStop(0, this.color);
      gradient.addColorStop(1, this.adjustColor(this.color, -30));

      ctx.fillStyle = gradient;
    } catch (error) {
      // Fallback para cor sólida se o gradiente falhar
      ctx.fillStyle = this.color;
    }

    ctx.fill();

    // Desenhar núcleo da célula
    const nucleusRadius = screenRadius * 0.4;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, nucleusRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.adjustColor(this.color, -50);
    ctx.fill();

    // Desenhar destaque do núcleo
    ctx.beginPath();
    ctx.arc(
      screenPos.x - nucleusRadius * 0.2,
      screenPos.y - nucleusRadius * 0.2,
      nucleusRadius * 0.4,
      0, Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();

    // Desenhar detalhes internos (organelas)
    this.drawCellDetails(ctx, screenPos, screenRadius);

    // MELHORIA: Adicionar efeito de rastro para células em movimento rápido
    // Aumentar o limite de velocidade para mostrar o rastro
    if (Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y) > 80) {
      this.addTrailEffect(ctx, camera);
    }
  }

  drawCellDetails(ctx: CanvasRenderingContext2D, screenPos: Vector2D, screenRadius: number): void {
    // Desenhar pequenas organelas dentro da célula
    const organelleCount = Math.floor(this.radius / 10);

    for (let i = 0; i < organelleCount; i++) {
      // Posição aleatória dentro da célula
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * screenRadius * 0.6;

      const x = screenPos.x + Math.cos(angle) * distance;
      const y = screenPos.y + Math.sin(angle) * distance;

      // Desenhar organela
      ctx.beginPath();
      ctx.arc(x, y, screenRadius * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = this.adjustColor(this.color, -20);
      ctx.fill();
    }
  }

  applyForce(force: Vector2D): void {
    // Verificação de segurança para força
    if (!force || typeof force.x !== 'number' || typeof force.y !== 'number') {
      return;
    }

    // CORREÇÃO: Garantir que a aceleração seja inicializada
    if (!this.acceleration) {
      this.acceleration = { x: 0, y: 0 };
    }

    // F = ma, mas simplificaremos dividindo pela massa
    // CORREÇÃO: Aumentar o efeito da força para garantir movimento
    const massEffect = Math.min(1, 100 / this.mass); // Reduzir o efeito da massa para células grandes
    this.acceleration.x += force.x * massEffect;
    this.acceleration.y += force.y * massEffect;
}

  // Aplicar uma força de repulsão de outra célula ou objeto
  applyRepulsion(otherPos: Vector2D, strength: number = 1): void {
    const direction = subtract(this.position, otherPos);
    const dist = distance(this.position, otherPos);

    // Evitar divisão por zero
    if (dist < 0.1) return;

    // MELHORIA: Aumentar força de repulsão para evitar sobreposição
    // Calcular força de repulsão (mais forte quando mais próximo)
    const forceMagnitude = strength * (1 / dist) * 2; // Multiplicado por 2 para repulsão mais forte
    const force = normalize(direction);
    force.x *= forceMagnitude;
    force.y *= forceMagnitude;
    this.applyForce(force);
  }

  // Auxiliar para escurecer/clarear uma cor
  private adjustColor(color: string, amount: number): string {
    try {
      // Para cores HSL
      if (color.startsWith('hsl')) {
        const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (match) {
          const h = parseInt(match[1]);
          const s = parseInt(match[2]);
          const l = Math.max(0, Math.min(100, parseInt(match[3]) + amount));
          return `hsl(${h}, ${s}%, ${l}%)`;
        }
      }

      // Para cores hex
      if (color.startsWith('#')) {
        // Converter hex para rgb
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        // Ajustar valores rgb
        const newR = Math.max(0, Math.min(255, r + amount));
        const newG = Math.max(0, Math.min(255, g + amount));
        const newB = Math.max(0, Math.min(255, b + amount));

        // Converter de volta para hex
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
      }

      // Fallback para outros formatos de cor
      return color;
    } catch (error) {
      // Retornar cor original se o ajuste falhar
      return color;
    }
  }

  // MELHORIA: Efeito de rastro melhorado para células em movimento rápido
   addTrailEffect(ctx: CanvasRenderingContext2D, camera: Camera): void {
    // Só adicionar rastro se estiver se movendo rápido o suficiente
    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    if (speed < 80) return;

    // Calcular pontos do rastro
    const trailLength = this.radius * 3; // Aumentado para rastro mais longo
    const direction = normalize(this.velocity);

    // Posição inicial do rastro (atrás da célula)
    const trailStart = {
      x: this.position.x - direction.x * trailLength,
      y: this.position.y - direction.y * trailLength
    };

    // Converter para coordenadas da tela
    const screenPos = camera.worldToScreen(this.position);
    const screenTrailStart = camera.worldToScreen(trailStart);

    // Desenhar rastro
    const gradient = ctx.createLinearGradient(
      screenTrailStart.x, screenTrailStart.y,
      screenPos.x, screenPos.y
    );

    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    // CORREÇÃO: Usar hsla() para adicionar transparência
    gradient.addColorStop(1, this.color.replace('hsl', 'hsla').replace(')', ', 0.5)')); // 50% de opacidade


    ctx.beginPath();
    ctx.moveTo(screenTrailStart.x, screenTrailStart.y);
    ctx.lineTo(screenPos.x, screenPos.y);
    ctx.lineWidth = this.radius * camera.scale * 0.8;
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    ctx.stroke();

    // MELHORIA: Adicionar partículas de rastro para movimento mais rápido
    if (speed > 200) {
      // Adicionar algumas partículas ao longo do rastro
      const particleCount = Math.min(5, Math.floor(speed / 100));

      for (let i = 0; i < particleCount; i++) {
        const t = Math.random();
        const particlePos = {
          x: screenTrailStart.x + (screenPos.x - screenTrailStart.x) * t,
          y: screenTrailStart.y + (screenPos.y - screenTrailStart.y) * t
        };

        const particleSize = (this.radius * camera.scale * 0.2) * Math.random();

        ctx.beginPath();
        ctx.arc(particlePos.x, particlePos.y, particleSize, 0, Math.PI * 2);
        ctx.fillStyle = `${this.color}40`; // 25% de opacidade //CORRIGIR ISSO TBM
        ctx.fill();
      }
    }
  }

  // Adicionar um efeito de brilho à célula (para power-ups ou estados especiais)
  addGlowEffect(ctx: CanvasRenderingContext2D, screenPos: Vector2D, screenRadius: number, color: string, intensity: number = 0.5): void {
    // Criar um efeito de brilho ao redor da célula
    const glowSize = screenRadius * 1.5;
    const gradient = ctx.createRadialGradient(
      screenPos.x, screenPos.y, screenRadius * 0.8,
      screenPos.x, screenPos.y, glowSize
    );

    // Fazer o brilho desaparecer a partir da borda da célula
    gradient.addColorStop(0, `${color}${Math.floor(intensity * 99).toString(16)}`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, glowSize, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  // Adicionar um efeito de ondulação quando a célula muda de tamanho drasticamente
  addRippleEffect(ctx: CanvasRenderingContext2D, camera: Camera): void {
    // Isso seria chamado quando a célula cresce ou encolhe significativamente
    const screenPos = camera.worldToScreen(this.position);
    const screenRadius = this.radius * camera.scale;

    // Desenhar círculos de ondulação
    for (let i = 1; i <= 3; i++) {
      const rippleRadius = screenRadius * (1 + i * 0.2);
      const opacity = 0.5 - i * 0.15; // Desaparecer à medida que as ondulações se expandem

      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, rippleRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Adicionar um efeito pulsante para destacar a célula
  addPulseHighlight(ctx: CanvasRenderingContext2D, camera: Camera, color: string = '#ffffff'): void {
    const screenPos = camera.worldToScreen(this.position);
    const baseRadius = this.radius * camera.scale;

    // Calcular tamanho do pulso com base no efeito de pulso
    const pulseRadius = baseRadius * (1 + this.pulseEffect * 0.2);

    // Desenhar anel pulsante
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, pulseRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `${color}${Math.floor((1 - this.pulseEffect) * 99).toString(16)}`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // MELHORIA: Adicionar método para aplicar impulso instantâneo
  applyImpulse(direction: Vector2D, strength: number): void {
    if (!direction || typeof direction.x !== 'number' || typeof direction.y !== 'number') {
      return;
    }

    // Normalizar direção
    const mag = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    if (mag > 0) {
      direction = {
        x: direction.x / mag,
        y: direction.y / mag
      };
    } else {
      return;
    }

    // Aplicar impulso diretamente à velocidade
    this.velocity.x += direction.x * strength;
    this.velocity.y += direction.y * strength;
  }

  // MELHORIA: Adicionar método para movimento mais suave
  moveToward(target: Vector2D, speed: number): void {
    if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') {
      return;
    }

    // Calcular direção para o alvo
    const direction = subtract(target, this.position);
    const dist = magnitude(direction);

    // Se já estiver no alvo, não fazer nada
    if (dist < 1) return;

    // Normalizar direção
    const normalizedDir = {
      x: direction.x / dist,
      y: direction.y / dist
    };

    // Calcular força com base na distância (mais forte quando mais longe)
    const forceMagnitude = Math.min(speed * 10, speed * (dist / 10));

    // Aplicar força
    this.applyForce({
      x: normalizedDir.x * forceMagnitude,
      y: normalizedDir.y * forceMagnitude
    });
  }
}
