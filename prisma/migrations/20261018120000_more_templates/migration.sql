-- Nuevos estilos de tarjeta: Luminosa (LIGHT), Impacto (BOLD) y Editorial (EDITORIAL).
ALTER TYPE "CardTemplate" ADD VALUE IF NOT EXISTS 'LIGHT';
ALTER TYPE "CardTemplate" ADD VALUE IF NOT EXISTS 'BOLD';
ALTER TYPE "CardTemplate" ADD VALUE IF NOT EXISTS 'EDITORIAL';
