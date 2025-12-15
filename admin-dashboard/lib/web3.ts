const EXPLORERS: Record<number, string> = {
  1: 'https://etherscan.io/address/',
  56: 'https://bscscan.com/address/',
  137: 'https://polygonscan.com/address/',
  8453: 'https://basescan.org/address/',
  42161: 'https://arbiscan.io/address/',
}

export function getExplorerUrl(chainId: number, address: string) {
  const base = EXPLORERS[chainId]
  if (!base) return undefined
  return `${base}${address}`
}
