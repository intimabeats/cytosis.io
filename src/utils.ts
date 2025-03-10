// src/utils.ts - Versão otimizada para melhor desempenho
// #=== 10% ===#

import { Vector2D } from './types';

// MELHORIA: Cache para IDs gerados para evitar colisões
const generatedIds = new Set<string>();

// Gerar um ID aleatório
export function generateId(): string {
  let id;
  do {
    // MELHORIA: ID mais longo para reduzir chance de colisão
    id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  } while (generatedIds.has(id));
  
  generatedIds.add(id);
  return id;
}

// MELHORIA: Cache de cores para reutilização
const colorCache: string[] = [];
const MAX_CACHED_COLORS = 100;

// Gerar uma cor aleatória
export function randomColor(): string {
  // Usar cor do cache se disponível
  if (colorCache.length > 0 && Math.random() < 0.7) {
    return colorCache[Math.floor(Math.random() * colorCache.length)];
  }
  
  // MELHORIA: Cores mais vibrantes e variadas
  const hue = Math.floor(Math.random() * 360);
  const saturation = 70 + Math.floor(Math.random() * 30); // 70-100%
  const lightness = 50 + Math.floor(Math.random() * 20); // 50-70%
  
  const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  
  // Adicionar ao cache se não estiver cheio
  if (colorCache.length < MAX_CACHED_COLORS) {
    colorCache.push(color);
  } else if (Math.random() < 0.1) {
    // Substituir aleatoriamente uma cor existente com baixa probabilidade
    colorCache[Math.floor(Math.random() * MAX_CACHED_COLORS)] = color;
  }
  
  return color;
}

// MELHORIA: Implementação otimizada de distância
// Calcular distância entre dois pontos
export function distance(a: Vector2D, b: Vector2D): number {
  // Verificação de segurança para evitar erros NaN
  if (!a || !b || typeof a.x !== 'number' || typeof a.y !== 'number' || 
      typeof b.x !== 'number' || typeof b.y !== 'number') {
    console.warn('Vetores inválidos no cálculo de distância', a, b);
    return Infinity; // Retornar um valor seguro
  }
  
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  
  // MELHORIA: Otimização para distâncias curtas
  // Para verificações de colisão, muitas vezes só precisamos saber se a distância é menor que um valor
  // Podemos evitar a raiz quadrada cara em muitos casos
  return Math.sqrt(dx * dx + dy * dy);
}

// MELHORIA: Função de distância ao quadrado para verificações de colisão mais eficientes
export function distanceSquared(a: Vector2D, b: Vector2D): number {
  if (!a || !b || typeof a.x !== 'number' || typeof a.y !== 'number' || 
      typeof b.x !== 'number' || typeof b.y !== 'number') {
    return Infinity;
  }
  
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

// Verificar se dois círculos estão colidindo
export function checkCollision(a: { position: Vector2D, radius: number }, b: { position: Vector2D, radius: number }): boolean {
  // Verificação de segurança para evitar erros NaN
  if (!a || !b || !a.position || !b.position || 
      typeof a.radius !== 'number' || typeof b.radius !== 'number') {
    return false;
  }
  
  // MELHORIA: Usar distância ao quadrado para melhor desempenho
  const radiusSum = a.radius + b.radius;
  const distSq = distanceSquared(a.position, b.position);
  return distSq < radiusSum * radiusSum;
}

// Normalizar um vetor
export function normalize(vector: Vector2D): Vector2D {
  // Verificação de segurança para evitar erros NaN
  if (!vector || typeof vector.x !== 'number' || typeof vector.y !== 'number') {
    return { x: 0, y: 0 };
  }
  
  const mag = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  if (mag === 0) return { x: 0, y: 0 };
  
  // MELHORIA: Retornar novo objeto para evitar mutação acidental
  return { 
    x: vector.x / mag, 
    y: vector.y / mag 
  };
}

// Calcular magnitude de um vetor
export function magnitude(vector: Vector2D): number {
  // Verificação de segurança para evitar erros NaN
  if (!vector || typeof vector.x !== 'number' || typeof vector.y !== 'number') {
    return 0;
  }
  
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
}

// MELHORIA: Implementação otimizada de magnitude ao quadrado
export function magnitudeSquared(vector: Vector2D): number {
  if (!vector || typeof vector.x !== 'number' || typeof vector.y !== 'number') {
    return 0;
  }
  
  return vector.x * vector.x + vector.y * vector.y;
}

// Limitar a magnitude de um vetor
export function limit(vector: Vector2D, max: number): Vector2D {
  // Verificação de segurança para evitar erros NaN
  if (!vector || typeof vector.x !== 'number' || typeof vector.y !== 'number' || typeof max !== 'number') {
    return { x: 0, y: 0 };
  }
  
  // MELHORIA: Otimização para evitar raiz quadrada quando possível
  const magSq = magnitudeSquared(vector);
  if (magSq > max * max) {
    const mag = Math.sqrt(magSq);
    return { 
      x: vector.x * max / mag, 
      y: vector.y * max / mag 
    };
  }
  
  // Retornar cópia para evitar mutação acidental
  return { ...vector };
}

// Adicionar dois vetores
export function add(a: Vector2D, b: Vector2D): Vector2D {
  // Verificação de segurança para evitar erros NaN
  if (!a || !b || typeof a.x !== 'number' || typeof a.y !== 'number' || 
      typeof b.x !== 'number' || typeof b.y !== 'number') {
    return { x: 0, y: 0 };
  }
  
  return { x: a.x + b.x, y: a.y + b.y };
}

// Subtrair vetor b de vetor a
export function subtract(a: Vector2D, b: Vector2D): Vector2D {
  // Verificação de segurança para evitar erros NaN
  if (!a || !b || typeof a.x !== 'number' || typeof a.y !== 'number' || 
      typeof b.x !== 'number' || typeof b.y !== 'number') {
    return { x: 0, y: 0 };
  }
  
  return { x: a.x - b.x, y: a.y - b.y };
}

// Multiplicar um vetor por um escalar
export function multiply(vector: Vector2D, scalar: number): Vector2D {
  // Verificação de segurança para evitar erros NaN
  if (!vector || typeof vector.x !== 'number' || typeof vector.y !== 'number' || typeof scalar !== 'number') {
    return { x: 0, y: 0 };
  }
  
  return { x: vector.x * scalar, y: vector.y * scalar };
}

// Dividir um vetor por um escalar
export function divide(vector: Vector2D, scalar: number): Vector2D {
  // Verificação de segurança para evitar erros NaN
  if (!vector || typeof vector.x !== 'number' || typeof vector.y !== 'number' || typeof scalar !== 'number') {
    return { ...vector };
  }
  
  if (scalar === 0) return { ...vector };
  return { x: vector.x / scalar, y: vector.y / scalar };
}

// Limitar um valor entre min e max
export function clamp(value: number, min: number, max: number): number {
  // Verificação de segurança para evitar erros NaN
  if (typeof value !== 'number' || typeof min !== 'number' || typeof max !== 'number') {
    return 0;
  }
  
  return Math.max(min, Math.min(max, value));
}

// MELHORIA: Implementação otimizada de lerp
// Interpolação linear entre dois valores
export function lerp(a: number, b: number, t: number): number {
  // Verificação de segurança para evitar erros NaN
  if (typeof a !== 'number' || typeof b !== 'number' || typeof t !== 'number') {
    return 0;
  }
  
  // Limitar t entre 0 e 1 para evitar extrapolação inesperada
  t = clamp(t, 0, 1);
  
  return a + (b - a) * t;
}

// Interpolação linear entre dois vetores
export function lerpVector(a: Vector2D, b: Vector2D, t: number): Vector2D {
  // Verificação de segurança para evitar erros NaN
  if (!a || !b || typeof a.x !== 'number' || typeof a.y !== 'number' || 
      typeof b.x !== 'number' || typeof b.y !== 'number' || typeof t !== 'number') {
    return { x: 0, y: 0 };
  }
  
  // Limitar t entre 0 e 1
  t = clamp(t, 0, 1);
  
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t)
  };
}

// Calcular massa a partir do raio
export function massFromRadius(radius: number): number {
  // Verificação de segurança para evitar erros NaN
  if (typeof radius !== 'number' || radius < 0) {
    return 0;
  }
  
  return Math.PI * radius * radius;
}

// Calcular raio a partir da massa
export function radiusFromMass(mass: number): number {
  // Verificação de segurança para evitar erros NaN
  if (typeof mass !== 'number' || mass < 0) {
    return 0;
  }
  
  return Math.sqrt(mass / Math.PI);
}

// MELHORIA: Implementação otimizada para geração de pontos de membrana
// Gerar pontos para um círculo com ruído (para membrana da célula)
export function generateMembranePoints(center: Vector2D, radius: number, points: number = 20): Vector2D[] {
  // Verificação de segurança para evitar erros NaN
  if (!center || typeof center.x !== 'number' || typeof center.y !== 'number' || 
      typeof radius !== 'number' || typeof points !== 'number') {
    console.warn("Parâmetros inválidos em generateMembranePoints", { center, radius, points });
    
    // Retornar um círculo padrão com 10 pontos
    const result: Vector2D[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      result.push({ 
        x: 0 + Math.cos(angle) * 10, 
        y: 0 + Math.sin(angle) * 10 
      });
    }
    return result;
  }
  
  // Garantir que points seja um número razoável
  points = Math.max(6, Math.min(points, 100));
  
  // MELHORIA: Pré-calcular senos e cossenos para melhor desempenho
  const result: Vector2D[] = [];
  const angleStep = (Math.PI * 2) / points;
  
  for (let i = 0; i < points; i++) {
    const angle = i * angleStep;
    // MELHORIA: Adicionar pequena variação no raio para aparência mais orgânica
    const radiusVariation = 1 + (Math.random() * 0.1 - 0.05); // ±5% variação
    const x = center.x + Math.cos(angle) * radius * radiusVariation;
    const y = center.y + Math.sin(angle) * radius * radiusVariation;
    result.push({ x, y });
  }
  
  // Verificar o resultado
  if (!Array.isArray(result) || result.length === 0) {
    console.warn("generateMembranePoints produziu resultado inválido");
    
    // Retornar um círculo padrão com 10 pontos
    const fallback: Vector2D[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      fallback.push({ 
        x: center.x + Math.cos(angle) * radius, 
        y: center.y + Math.sin(angle) * radius 
      });
    }
    return fallback;
  }
  
  return result;
}

// Verificar se um valor é NaN e fornecer um padrão
export function validateNumber(value: number, defaultValue: number): number {
  return isNaN(value) ? defaultValue : value;
}

// Validar um vetor de posição para evitar NaN
export function validatePosition(position: Vector2D, defaultPosition: Vector2D): Vector2D {
  if (!position) return { ...defaultPosition };
  
  return {
    x: validateNumber(position.x, defaultPosition.x),
    y: validateNumber(position.y, defaultPosition.y)
  };
}

// MELHORIA: Implementação mais robusta para posição aleatória
// Obter uma posição aleatória dentro dos limites
export function randomPosition(bounds: { x: number, y: number } | { width: number, height: number }): Vector2D {
  // Verificar se estamos recebendo o formato correto de limites
  if ('width' in bounds && 'height' in bounds) {
    // Verificar se os limites são válidos
    if (typeof bounds.width !== 'number' || typeof bounds.height !== 'number' ||
        bounds.width <= 0 || bounds.height <= 0) {
      console.warn('Limites inválidos em randomPosition', bounds);
      return { x: 100, y: 100 }; // Valor padrão seguro
    }
    
    return {
      x: Math.random() * bounds.width,
      y: Math.random() * bounds.height
    };
  } else if ('x' in bounds && 'y' in bounds) {
    // Verificar se os limites são válidos
    if (typeof bounds.x !== 'number' || typeof bounds.y !== 'number' ||
        bounds.x <= 0 || bounds.y <= 0) {
      console.warn('Limites inválidos em randomPosition', bounds);
      return { x: 100, y: 100 }; // Valor padrão seguro
    }
    
    return {
      x: Math.random() * bounds.x,
      y: Math.random() * bounds.y
    };
  }
  
  // Fallback para evitar erros
  console.warn('Limites inválidos em randomPosition', bounds);
  return { x: 100, y: 100 };
}

// MELHORIA: Implementação mais robusta para velocidade aleatória
// Obter uma velocidade aleatória com velocidade máxima
export function randomVelocity(maxSpeed: number): Vector2D {
  // Verificação de segurança para evitar erros NaN
  if (typeof maxSpeed !== 'number' || maxSpeed <= 0) {
    maxSpeed = 1; // Valor padrão seguro
  }
  
  const angle = Math.random() * Math.PI * 2;
  // MELHORIA: Distribuição mais natural de velocidades
  // Usar distribuição quadrática para ter mais velocidades médias e menos extremas
  const speed = Math.sqrt(Math.random()) * maxSpeed;
  
  return {
    x: Math.cos(angle) * speed,
    y: Math.sin(angle) * speed
  };
}

// Função de ease in out para transições suaves
export function easeInOut(t: number): number {
  // Verificação de segurança para evitar erros NaN
  if (typeof t !== 'number') {
    return 0;
  }
  
  // Limitar t entre 0 e 1
  t = clamp(t, 0, 1);
  
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// MELHORIA: Novas funções úteis

// Calcular ângulo entre dois vetores
export function angleBetween(a: Vector2D, b: Vector2D): number {
  if (!a || !b || typeof a.x !== 'number' || typeof a.y !== 'number' || 
      typeof b.x !== 'number' || typeof b.y !== 'number') {
    return 0;
  }
  
  return Math.atan2(b.y - a.y, b.x - a.x);
}

// Rotacionar um vetor por um ângulo
export function rotateVector(vector: Vector2D, angle: number): Vector2D {
  if (!vector || typeof vector.x !== 'number' || typeof vector.y !== 'number' || 
      typeof angle !== 'number') {
    return { x: 0, y: 0 };
  }
  
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos
  };
}

// Calcular produto escalar de dois vetores
export function dotProduct(a: Vector2D, b: Vector2D): number {
  if (!a || !b || typeof a.x !== 'number' || typeof a.y !== 'number' || 
      typeof b.x !== 'number' || typeof b.y !== 'number') {
    return 0;
  }
  
  return a.x * b.x + a.y * b.y;
}

// Calcular reflexão de um vetor em relação a uma normal
export function reflect(vector: Vector2D, normal: Vector2D): Vector2D {
  if (!vector || !normal || typeof vector.x !== 'number' || typeof vector.y !== 'number' || 
      typeof normal.x !== 'number' || typeof normal.y !== 'number') {
    return { x: 0, y: 0 };
  }
  
  const normalizedNormal = normalize(normal);
  const dot = dotProduct(vector, normalizedNormal) * 2;
  
  return {
    x: vector.x - normalizedNormal.x * dot,
    y: vector.y - normalizedNormal.y * dot
  };
}

// Interpolar entre cores
export function lerpColor(color1: string, color2: string, t: number): string {
  // Verificar se as cores são válidas
  if (typeof color1 !== 'string' || typeof color2 !== 'string' || typeof t !== 'number') {
    return '#ffffff'; // Branco como fallback
  }
  
  // Limitar t entre 0 e 1
  t = clamp(t, 0, 1);
  
  // Converter cores para RGB
  let r1, g1, b1, r2, g2, b2;
  
  // Processar cor 1
  if (color1.startsWith('#')) {
    r1 = parseInt(color1.slice(1, 3), 16);
    g1 = parseInt(color1.slice(3, 5), 16);
    b1 = parseInt(color1.slice(5, 7), 16);
  } else if (color1.startsWith('rgb')) {
    const match = color1.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      r1 = parseInt(match[1]);
      g1 = parseInt(match[2]);
      b1 = parseInt(match[3]);
    } else {
      return '#ffffff'; // Fallback
    }
  } else {
    return '#ffffff'; // Fallback
  }
  
  // Processar cor 2
  if (color2.startsWith('#')) {
    r2 = parseInt(color2.slice(1, 3), 16);
    g2 = parseInt(color2.slice(3, 5), 16);
    b2 = parseInt(color2.slice(5, 7), 16);
  } else if (color2.startsWith('rgb')) {
    const match = color2.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      r2 = parseInt(match[1]);
      g2 = parseInt(match[2]);
      b2 = parseInt(match[3]);
    } else {
      return '#ffffff'; // Fallback
    }
  } else {
    return '#ffffff'; // Fallback
  }
  
  // Interpolar valores RGB
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  
  // Converter de volta para string de cor
  return `rgb(${r}, ${g}, ${b})`;
}

// Gerar uma cor complementar
export function complementaryColor(color: string): string {
  // Verificar se a cor é válida
  if (typeof color !== 'string') {
    return '#ffffff'; // Branco como fallback
  }
  
  let r, g, b;
  
  // Processar cor
  if (color.startsWith('#')) {
    r = parseInt(color.slice(1, 3), 16);
    g = parseInt(color.slice(3, 5), 16);
    b = parseInt(color.slice(5, 7), 16);
  } else if (color.startsWith('rgb')) {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      r = parseInt(match[1]);
      g = parseInt(match[2]);
      b = parseInt(match[3]);
    } else {
      return '#ffffff'; // Fallback
    }
  } else {
    return '#ffffff'; // Fallback
  }
  
  // Calcular cor complementar (inverter RGB)
  const rComp = 255 - r;
  const gComp = 255 - g;
  const bComp = 255 - b;
  
  // Converter de volta para string de cor
  return `rgb(${rComp}, ${gComp}, ${bComp})`;
}
