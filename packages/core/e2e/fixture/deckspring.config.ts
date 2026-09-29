import type { DeckspringConfig } from '@deckspring/core';

const deckspringConfig: DeckspringConfig = {
  studio: process.env.DECKSPRING_E2E_STUDIO === '1',
};

export default deckspringConfig;
