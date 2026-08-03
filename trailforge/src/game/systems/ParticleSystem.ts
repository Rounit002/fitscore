export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
}

export class ParticleSystem {
  private readonly particles: Particle[] = [];
  private readonly pool: Particle[] = [];

  burst(x: number, y: number, color: string, count: number, force = 3): void {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.35 + Math.random() * 0.65) * force;
      const particle = this.pool.pop() ?? { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0, color, gravity: 0 };
      Object.assign(particle, {
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - force * 0.25,
        life: 0.42 + Math.random() * 0.35, maxLife: 0.8, size: 3 + Math.random() * 4, color, gravity: 7,
      });
      particle.maxLife = particle.life;
      this.particles.push(particle);
    }
  }

  dust(x: number, y: number, direction: number): void {
    const particle = this.pool.pop() ?? { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0, color: '#d6b47c', gravity: 0 };
    Object.assign(particle, {
      x, y, vx: -direction * (1 + Math.random() * 2), vy: -0.5 - Math.random(), life: 0.45,
      maxLife: 0.45, size: 5 + Math.random() * 5, color: '#d8bc8d', gravity: -0.3,
    });
    this.particles.push(particle);
  }

  update(deltaSeconds: number): void {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.life -= deltaSeconds;
      if (particle.life <= 0) {
        this.particles.splice(index, 1);
        this.pool.push(particle);
        continue;
      }
      particle.vy += particle.gravity * deltaSeconds;
      particle.x += particle.vx * deltaSeconds * 60;
      particle.y += particle.vy * deltaSeconds * 60;
    }
  }

  draw(context: CanvasRenderingContext2D): void {
    for (const particle of this.particles) {
      context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size * (0.55 + particle.life / particle.maxLife), 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  clear(): void {
    this.pool.push(...this.particles.splice(0));
  }
}
