/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  Visualizer Info Panel — Transaction / Holder Detail Display    ║
 * ║  Shows NETWORK, TIME, FROM, TO, VALUE, USD per chain type       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use client';

import React from 'react';
import type {
  InfoObject,
  Transfer,
  HolderInfo,
} from '@/lib/onchain/visualizer-types';
import { shortenAddress } from '@/lib/onchain/visualizer-types';

/* ═══════════════════════ Props ══════════════════════════════════ */

interface VisualizerInfoProps {
  object: InfoObject;
  base?: string[];
}

/* ═══════════════════════ Helpers ════════════════════════════════ */

function formatDate(ts: string): string {
  return new Date(ts).toLocaleString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    timeZoneName: 'short',
  });
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value > 0.005 ? 2 : 6,
    notation: value > 1e6 ? 'compact' : 'standard',
  }).format(value);
}

function formatValue(value: number | undefined): string {
  if (value == null) return '-';
  if (value > 0.005) {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 4,
      notation: value > 1e6 ? 'compact' : 'standard',
    }).format(value);
  }
  return String(value);
}

function isTransfer(obj: InfoObject): obj is Transfer {
  return obj != null && 'transactionHash' in obj;
}

function isHolderInfo(obj: InfoObject): obj is HolderInfo {
  return obj != null && 'holder' in obj;
}

/* ═══════════════════════ Label Row ══════════════════════════════ */

function InfoLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-mono text-teal-400/60 tracking-wider uppercase mt-2 first:mt-0">
      {children}
    </div>
  );
}

function InfoValue({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: 'green' | 'red' | 'gray';
}) {
  const colorMap = {
    green: 'text-green-400',
    red: 'text-red-400',
    gray: 'text-white/40',
  };

  return (
    <div className={`text-xs font-mono ${color ? colorMap[color] : 'text-white/70'}`}>
      {children}
    </div>
  );
}

function Separator() {
  return <div className="h-px bg-white/5 my-1.5" />;
}

/* ═══════════════════════ Address Display ════════════════════════ */

function AddressDisplay({ address }: { address: { address: string; knownEntity?: { name: string }; userEntity?: { name: string } } }) {
  const name = address.knownEntity?.name ?? address.userEntity?.name;
  return (
    <div className="flex flex-col">
      {name && <span className="text-xs text-white/80 font-mono">{name}</span>}
      <span className="text-[10px] text-white/30 font-mono">
        {shortenAddress(address.address, 6)}
      </span>
    </div>
  );
}

/* ═══════════════════════ Transfer Info ══════════════════════════ */

function TransferInfo({ tx, base }: { tx: Transfer; base?: string[] }) {
  // Direction colors
  const toIsBase = base?.some(
    (b) =>
      b === tx.toAddress.knownEntity?.id ||
      b === tx.toAddress.userEntity?.id ||
      b === tx.toAddress.address,
  );
  const fromIsBase = base?.some(
    (b) =>
      b === tx.fromAddress.knownEntity?.id ||
      b === tx.fromAddress.userEntity?.id ||
      b === tx.fromAddress.address,
  );

  const usdColor: 'green' | 'red' | 'gray' =
    (toIsBase && fromIsBase) || (!toIsBase && !fromIsBase)
      ? 'gray'
      : toIsBase
        ? 'green'
        : 'red';

  return (
    <>
      <InfoLabel>Network:</InfoLabel>
      <InfoValue>
        <span className="uppercase">{tx.chain}</span>
      </InfoValue>

      <InfoLabel>Time:</InfoLabel>
      <InfoValue>
        <span className="text-teal-300/60 hover:text-teal-300/90 cursor-pointer transition-colors">
          {formatDate(tx.blockTimestamp)}
        </span>
      </InfoValue>

      <Separator />

      <InfoLabel>From:</InfoLabel>
      <AddressDisplay address={tx.fromAddress} />

      <InfoLabel>To:</InfoLabel>
      <AddressDisplay address={tx.toAddress} />

      <Separator />

      <InfoLabel>Value:</InfoLabel>
      <InfoValue>
        {formatValue(tx.unitValue)}{' '}
        {tx.tokenSymbol && (
          <span className="text-white/40 uppercase">{tx.tokenSymbol}</span>
        )}
      </InfoValue>

      <InfoLabel>USD:</InfoLabel>
      <InfoValue color={usdColor}>{formatUsd(tx.historicalUSD ?? 0)}</InfoValue>
    </>
  );
}

/* ═══════════════════════ Holder Info ════════════════════════════ */

function HolderInfoDisplay({ info }: { info: HolderInfo }) {
  const { holder } = info;

  return (
    <>
      <InfoLabel>
        {'entity' in holder ? 'Entity' : 'Address'}:
      </InfoLabel>
      <InfoValue>
        {'entity' in holder && holder.entity ? (
          <span>{holder.entity.name}</span>
        ) : (
          <span>{shortenAddress(holder.address.address, 6)}</span>
        )}
      </InfoValue>

      <Separator />

      <InfoLabel>Balance:</InfoLabel>
      <InfoValue>{formatValue(holder.balance)}</InfoValue>

      <InfoLabel>USD Value:</InfoLabel>
      <InfoValue>{formatUsd(holder.usd)}</InfoValue>
    </>
  );
}

/* ═══════════════════════ Main Component ═════════════════════════ */

export default function VisualizerInfo({ object, base }: VisualizerInfoProps) {
  if (!object) {
    return (
      <div className="text-xs text-white/20 font-mono py-2">
        Click on a transaction for more details
      </div>
    );
  }

  return (
    <div
      className="grid gap-x-3 py-1"
      style={{ gridTemplateColumns: '1fr 5fr' }}
    >
      {isTransfer(object) && <TransferInfo tx={object} base={base} />}
      {isHolderInfo(object) && <HolderInfoDisplay info={object} />}
    </div>
  );
}
