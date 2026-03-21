// ============================================================================
// Rule Engine Types — Metis MVP
// ============================================================================

export type RuleNodeType =
  | 'dataIngestion'
  | 'fraudDetection'
  | 'aiScoring'
  | 'decision'
  | 'customRule';

// Per-type configuration schemas
export interface DataIngestionConfig {
  sources: string[];
  refreshInterval: number; // minutes
  dataQualityThreshold: number; // 0-100
}

export interface FraudDetectionConfig {
  falsePositiveLimit: number; // percentage
  anomalyModel: 'isolation_forest' | 'autoencoder' | 'ensemble';
  blockThreshold: number; // 0-1
  ocrEnabled: boolean;
}

export interface AIScoringConfig {
  weights: { label: string; value: number }[];
  fairBoostEnabled: boolean;
  approvalThreshold: number; // 0-100
  rejectThreshold: number; // 0-100
}

export interface DecisionConfig {
  action: 'approve' | 'reject' | 'manual_review' | 'escalate';
  autoExecute: boolean;
  maxExposure: number; // €
  requiresSignoff: boolean;
}

export interface CustomRuleConfig {
  expression: string; // e.g. "score > 70 AND fraud_flag == false"
  operator: 'AND' | 'OR' | 'NOT';
  conditions: { field: string; op: string; value: string }[];
}

export type NodeConfig =
  | DataIngestionConfig
  | FraudDetectionConfig
  | AIScoringConfig
  | DecisionConfig
  | CustomRuleConfig;

export interface RuleNodeData {
  label: string;
  type: RuleNodeType;
  description: string;
  config: NodeConfig;
  active: boolean;
}

// Node style metadata
export const NODE_META: Record<
  RuleNodeType,
  { color: string; icon: string; defaultLabel: string; glowColor: string }
> = {
  dataIngestion: {
    color: '#00E5FF',
    icon: 'database',
    defaultLabel: 'Data Ingestion',
    glowColor: 'rgba(0,229,255,0.3)',
  },
  fraudDetection: {
    color: '#FACC15',
    icon: 'shield',
    defaultLabel: 'Fraud Detection',
    glowColor: 'rgba(250,204,21,0.3)',
  },
  aiScoring: {
    color: '#7B2CBF',
    icon: 'layers',
    defaultLabel: 'AI Scoring',
    glowColor: 'rgba(123,44,191,0.3)',
  },
  decision: {
    color: '#00FF66',
    icon: 'check-circle',
    defaultLabel: 'Decision',
    glowColor: 'rgba(0,255,102,0.3)',
  },
  customRule: {
    color: '#FF0055',
    icon: 'code',
    defaultLabel: 'Custom Rule',
    glowColor: 'rgba(255,0,85,0.3)',
  },
};

// Default configs per type
export function getDefaultConfig(type: RuleNodeType): NodeConfig {
  switch (type) {
    case 'dataIngestion':
      return {
        sources: ['C.R. Bankitalia', 'Bilancio XBRL', 'Cerved APIs'],
        refreshInterval: 60,
        dataQualityThreshold: 85,
      } as DataIngestionConfig;
    case 'fraudDetection':
      return {
        falsePositiveLimit: 2.0,
        anomalyModel: 'ensemble',
        blockThreshold: 0.85,
        ocrEnabled: true,
      } as FraudDetectionConfig;
    case 'aiScoring':
      return {
        weights: [
          { label: 'Bilancio XBRL', value: 40 },
          { label: 'Centrale Rischi', value: 50 },
          { label: 'Web NLP (Nowcasting)', value: 10 },
        ],
        fairBoostEnabled: true,
        approvalThreshold: 65,
        rejectThreshold: 35,
      } as AIScoringConfig;
    case 'decision':
      return {
        action: 'approve',
        autoExecute: false,
        maxExposure: 500000,
        requiresSignoff: true,
      } as DecisionConfig;
    case 'customRule':
      return {
        expression: 'score > 70 AND fraud_flag == false',
        operator: 'AND',
        conditions: [
          { field: 'score', op: '>', value: '70' },
          { field: 'fraud_flag', op: '==', value: 'false' },
        ],
      } as CustomRuleConfig;
  }
}

// Simulation result type
export interface SimulationResult {
  approvalRate: number;
  defaultRate: number;
  fairLendingScore: number;
  avgProcessingTime: number;
  falsePositiveRate: number;
  totalApplications: number;
  approved: number;
  rejected: number;
  manualReview: number;
}
