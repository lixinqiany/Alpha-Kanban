export enum Manufacturer {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
}

export const ManufacturerLabel: Record<Manufacturer, string> = {
  [Manufacturer.OPENAI]: 'OpenAI',
  [Manufacturer.ANTHROPIC]: 'Anthropic',
}

export const MANUFACTURERS = Object.values(Manufacturer)
