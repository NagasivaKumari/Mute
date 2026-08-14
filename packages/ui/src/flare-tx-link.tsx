const FLARE_EXPLORER = 'https://coston2-explorer.flare.network/tx';

interface FlareTxLinkProps {
  txHash: string;
  className?: string;
}

export function FlareTxLink({ txHash, className = '' }: FlareTxLinkProps) {
  const shortHash = `${txHash.slice(0, 8)}...${txHash.slice(-6)}`;

  return (
    <a
      href={`${FLARE_EXPLORER}/${txHash}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`font-mono text-sm text-blue-400 hover:underline ${className}`}
    >
      {shortHash}
    </a>
  );
}
