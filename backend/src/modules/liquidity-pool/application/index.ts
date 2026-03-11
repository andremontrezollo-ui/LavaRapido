/**
 * Liquidity Pool - Application Layer
 * 
 * Use cases: reserve liquidity, confirm liquidation, query health.
 */

// Application-level contracts (data transfer types, not domain entities)
export interface Reserve {
  totalAmount: number;
  availableAmount: number;
  reservedAmount: number;
  currency: string;
}

export interface LiquidityObligation {
  id: string;
  amount: number;
  createdAt: Date;
  status: 'pending' | 'fulfilled' | 'expired';
}

export interface PoolHealth {
  status: 'healthy' | 'warning' | 'critical';
  utilizationRate: number;
  availableRate: number;
  pendingObligations: number;
}

export interface LiquidityReservedEvent {
  type: 'LIQUIDITY_RESERVED';
  obligationId: string;
  amount: number;
  timestamp: Date;
}

export interface LiquidityReleasedEvent {
  type: 'LIQUIDITY_RELEASED';
  obligationId: string;
  amount: number;
  reason: string;
  timestamp: Date;
}

export interface PoolHealthChangedEvent {
  type: 'POOL_HEALTH_CHANGED';
  previousStatus: string;
  newStatus: string;
  utilizationRate: number;
  timestamp: Date;
}

export type PoolEvent = LiquidityReservedEvent | LiquidityReleasedEvent | PoolHealthChangedEvent;

/**
 * Calculates pool health based on available reserve ratio.
 * - Critical: availableRate < 10% (pool near depletion)
 * - Warning: availableRate < 20% (low liquidity)
 * - Healthy: availableRate >= 20%
 */
function calculatePoolHealth(reserve: Reserve): Omit<PoolHealth, 'pendingObligations'> {
  if (reserve.totalAmount <= 0) {
    return { status: 'critical', utilizationRate: 1, availableRate: 0 };
  }
  const utilizationRate = reserve.reservedAmount / reserve.totalAmount;
  const availableRate = reserve.availableAmount / reserve.totalAmount;
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (availableRate < 0.1) status = 'critical';
  else if (availableRate < 0.2) status = 'warning';
  return { status, utilizationRate, availableRate };
}

// Ports
export interface PoolLedger {
  getReserve(): Promise<Reserve>;
  updateReserve(reserve: Reserve): Promise<void>;
  saveObligation(obligation: LiquidityObligation): Promise<void>;
  findObligation(id: string): Promise<LiquidityObligation | null>;
  updateObligation(obligation: LiquidityObligation): Promise<void>;
  findPendingObligations(): Promise<LiquidityObligation[]>;
}

export interface IdGenerator {
  generate(): string;
}

export interface EventPublisher {
  publish(event: PoolEvent): Promise<void>;
}

// Use Cases
export class ReserveLiquidityUseCase {
  constructor(
    private readonly ledger: PoolLedger,
    private readonly idGenerator: IdGenerator,
    private readonly publisher: EventPublisher
  ) {}

  async execute(amount: number): Promise<LiquidityObligation | null> {
    const reserve = await this.ledger.getReserve();

    if (reserve.availableAmount < amount) {
      return null; // Insufficient liquidity
    }

    const obligation: LiquidityObligation = {
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
