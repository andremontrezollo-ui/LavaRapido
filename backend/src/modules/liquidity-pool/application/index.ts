/**
 * Liquidity Pool - Application Layer
 * 
 * Use cases: reserve liquidity, confirm liquidation, query health.
 * Uses simplified data transfer types to avoid domain coupling.
 */

// ── Local application-layer types ──────────────────────────────────────────────

export interface Reserve {
  totalAmount: number;
  availableAmount: number;
  reservedAmount: number;
}

export interface Obligation {
  id: string;
  amount: number;
  createdAt: Date;
  status: 'pending' | 'fulfilled' | 'cancelled';
  poolId?: string;
}

export interface PoolHealth {
  status: 'healthy' | 'warning' | 'critical';
  utilizationRate: number;
  pendingObligations?: number;
}

export interface PoolEvent {
  type: string;
  timestamp: Date;
}

export interface LiquidityReservedEvent extends PoolEvent {
  type: 'LIQUIDITY_RESERVED';
  obligationId: string;
  amount: number;
}

export interface LiquidityReleasedEvent extends PoolEvent {
  type: 'LIQUIDITY_RELEASED';
  obligationId: string;
  amount: number;
  reason: string;
}

export interface PoolHealthChangedEvent extends PoolEvent {
  type: 'POOL_HEALTH_CHANGED';
  previousStatus: string;
  newStatus: string;
  utilizationRate: number;
}

function calculatePoolHealth(reserve: Reserve): PoolHealth {
  const utilization = reserve.totalAmount > 0
    ? (reserve.reservedAmount / reserve.totalAmount)
    : 0;
  const status = utilization > 0.9 ? 'critical' : utilization > 0.7 ? 'warning' : 'healthy';
  return { status, utilizationRate: utilization };
}

// ── Ports ──────────────────────────────────────────────────────────────────────

export interface PoolLedger {
  getReserve(): Promise<Reserve>;
  updateReserve(reserve: Reserve): Promise<void>;
  saveObligation(obligation: Obligation): Promise<void>;
  findObligation(id: string): Promise<Obligation | null>;
  updateObligation(obligation: Obligation): Promise<void>;
  findPendingObligations(): Promise<Obligation[]>;
}

export interface IdGenerator {
  generate(): string;
}

export interface EventPublisher {
  publish(event: PoolEvent): Promise<void>;
}

// ── Use Cases ──────────────────────────────────────────────────────────────────

export class ReserveLiquidityUseCase {
  constructor(
    private readonly ledger: PoolLedger,
    private readonly idGenerator: IdGenerator,
    private readonly publisher: EventPublisher
  ) {}

  async execute(amount: number): Promise<Obligation | null> {
    const reserve = await this.ledger.getReserve();

    if (reserve.availableAmount < amount) {
      return null; // Insufficient liquidity
    }

    const obligation: Obligation = {
      id: this.idGenerator.generate(),
      amount,
      createdAt: new Date(),
      status: 'pending',
    };

    const updatedReserve: Reserve = {
      ...reserve,
      availableAmount: reserve.availableAmount - amount,
      reservedAmount: reserve.reservedAmount + amount,
    };

    await this.ledger.saveObligation(obligation);
    await this.ledger.updateReserve(updatedReserve);

    const event: LiquidityReservedEvent = {
      type: 'LIQUIDITY_RESERVED',
      obligationId: obligation.id,
      amount,
      timestamp: new Date(),
    };
    await this.publisher.publish(event);

    // Check for health changes
    await this.checkHealthChange(reserve, updatedReserve);

    return obligation;
  }

  private async checkHealthChange(
    previous: Reserve,
    current: Reserve
  ): Promise<void> {
    const previousHealth = calculatePoolHealth(previous);
    const currentHealth = calculatePoolHealth(current);

    if (previousHealth.status !== currentHealth.status) {
      const event: PoolHealthChangedEvent = {
        type: 'POOL_HEALTH_CHANGED',
        previousStatus: previousHealth.status,
        newStatus: currentHealth.status,
        utilizationRate: currentHealth.utilizationRate,
        timestamp: new Date(),
      };
      await this.publisher.publish(event);
    }
  }
}

export class ConfirmLiquidationUseCase {
  constructor(
    private readonly ledger: PoolLedger,
    private readonly publisher: EventPublisher
  ) {}

  async execute(obligationId: string): Promise<boolean> {
    const obligation = await this.ledger.findObligation(obligationId);
    
    if (!obligation || obligation.status !== 'pending') {
      return false;
    }

    const reserve = await this.ledger.getReserve();
    const updatedReserve: Reserve = {
      ...reserve,
      totalAmount: reserve.totalAmount - obligation.amount,
      reservedAmount: reserve.reservedAmount - obligation.amount,
    };

    await this.ledger.updateObligation({ ...obligation, status: 'fulfilled' });
    await this.ledger.updateReserve(updatedReserve);

    const event: LiquidityReleasedEvent = {
      type: 'LIQUIDITY_RELEASED',
      obligationId,
      amount: obligation.amount,
      reason: 'fulfilled',
      timestamp: new Date(),
    };
    await this.publisher.publish(event);

    return true;
  }
}

export class QueryPoolHealthUseCase {
  constructor(private readonly ledger: PoolLedger) {}

  async execute(): Promise<PoolHealth> {
    const reserve = await this.ledger.getReserve();
    const pendingObligations = await this.ledger.findPendingObligations();
    
    const health = calculatePoolHealth(reserve);
    return {
      ...health,
      pendingObligations: pendingObligations.length,
    };
  }
}
