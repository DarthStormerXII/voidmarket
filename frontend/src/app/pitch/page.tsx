"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { VoidLogo } from "@/components/ui/void-logo"

const SLIDE_COUNT = 12

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="inline-block">
      <path d="M3 8l3.5 3.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="inline-block">
      <path d="M4 4l8 8M12 4l-8 8" stroke="white" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ArrowDown() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="animate-bounce">
      <path d="M10 4v12m0 0l-4-4m4 4l4-4" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─── Slide Components ────────────────────────────────────── */

function TitleSlide() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 text-center">
      <VoidLogo size="xl" />
      <h1 className="font-[family-name:var(--font-accent)] text-5xl sm:text-7xl font-black tracking-[0.2em] text-glow">
        VOIDMARKET
      </h1>
      <p className="font-[family-name:var(--font-display)] text-lg sm:text-xl text-white/70 max-w-xl tracking-wide uppercase">
        Private prediction markets inside Telegram
      </p>
      <p className="font-[family-name:var(--font-body)] text-sm text-white/40 tracking-wide">
        Your bet goes into the void.
      </p>
      <div className="mt-4 flex flex-col items-center gap-2">
        <p className="font-[family-name:var(--font-body)] text-xs text-white/30 uppercase tracking-widest">
          ETHGlobal HackMoney 2026
        </p>
        <p className="font-[family-name:var(--font-body)] text-xs text-white/30">
          Solo build by <span className="text-white/60">Darth Stormer</span>
        </p>
      </div>
      <div className="mt-8">
        <ArrowDown />
      </div>
    </div>
  )
}

function ProblemSlide() {
  const problems = [
    {
      num: "01",
      title: "Public Bets = Herding",
      desc: "On Polymarket, everyone sees the YES/NO split in real time. Late bettors have an information advantage. Whales counter-position. The market itself becomes the signal, not the outcome.",
    },
    {
      num: "02",
      title: "Terrible UX",
      desc: "You need a wallet, ETH for gas, token approvals, and deep crypto knowledge. Your friend in a Telegram group is never going to do all that to bet $5.",
    },
    {
      num: "03",
      title: "No Social Layer",
      desc: "Betting is more fun with friends. No way to fork a market for a private group bet, compete as teams, or build betting reputation that travels with you.",
    },
  ]

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
      <h2 className="font-[family-name:var(--font-accent)] text-3xl sm:text-4xl font-bold tracking-widest text-glow">
        THE PROBLEM
      </h2>
      <p className="font-[family-name:var(--font-display)] text-sm text-white/50 uppercase tracking-wider">
        Prediction markets today are broken
      </p>
      <div className="flex flex-col gap-5 w-full">
        {problems.map((p) => (
          <div
            key={p.num}
            className="border border-white/10 rounded-xl p-5 sm:p-6 bg-white/[0.02] hover:border-white/25 transition-colors duration-300"
          >
            <div className="flex items-start gap-4">
              <span className="font-[family-name:var(--font-accent)] text-2xl font-black text-white/20 shrink-0">
                {p.num}
              </span>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-base sm:text-lg font-semibold uppercase tracking-wider mb-2">
                  {p.title}
                </h3>
                <p className="font-[family-name:var(--font-body)] text-sm text-white/50 leading-relaxed">
                  {p.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SolutionSlide() {
  const pillars = [
    {
      title: "Private Betting",
      desc: "Commit-reveal cryptography hides your bet direction. Nobody knows if you bet YES or NO until resolution.",
      icon: "🔒",
    },
    {
      title: "Zero-Friction UX",
      desc: "Open Telegram, tap the Mini App, pick a market, tap 'Send to the Void.' No wallet, no gas, no approvals.",
      icon: "⚡",
    },
    {
      title: "Portable Identity",
      desc: "Every user gets username.voidmarket.eth via ENS CCIP-Read. Zero gas. Your reputation travels with you.",
      icon: "🌐",
    },
    {
      title: "Social Wagering",
      desc: "Fork markets for your friend group. Form teams. Battle other teams in Novas. Climb the leaderboard.",
      icon: "👥",
    },
  ]

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
      <h2 className="font-[family-name:var(--font-accent)] text-3xl sm:text-4xl font-bold tracking-widest text-glow">
        THE SOLUTION
      </h2>
      <p className="font-[family-name:var(--font-display)] text-sm text-white/50 uppercase tracking-wider text-center">
        A Telegram Mini App where bets are private, UX is gasless, and identity is portable
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {pillars.map((p) => (
          <div
            key={p.title}
            className="border border-white/10 rounded-xl p-5 bg-white/[0.02] hover:border-white/25 transition-colors duration-300"
          >
            <div className="text-2xl mb-3">{p.icon}</div>
            <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-wider mb-2">
              {p.title}
            </h3>
            <p className="font-[family-name:var(--font-body)] text-xs text-white/50 leading-relaxed">
              {p.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function HowItWorksSlide() {
  const steps = [
    {
      step: "1",
      title: "Place Bet",
      desc: "Pick YES or NO. Frontend generates commitment = keccak256(direction, salt). Salt stored in Telegram Cloud Storage.",
      badge: "CLIENT",
    },
    {
      step: "2",
      title: "Hidden On-Chain",
      desc: "Circle wallet signs tx. Only commitment hash goes on-chain. Direction stays hidden. User sees: 'Sent to the void.'",
      badge: "ON-CHAIN",
    },
    {
      step: "3",
      title: "Resolve",
      desc: "Admin/oracle sets outcome. All forked markets auto-resolve. Bettors get notified to reveal.",
      badge: "ORACLE",
    },
    {
      step: "4",
      title: "Reveal & Claim",
      desc: "Contract verifies keccak256(direction, salt) == commitment. Winners claim original bet + share of losers' pool.",
      badge: "ON-CHAIN",
    },
  ]

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
      <h2 className="font-[family-name:var(--font-accent)] text-3xl sm:text-4xl font-bold tracking-widest text-glow">
        HOW IT WORKS
      </h2>
      <p className="font-[family-name:var(--font-display)] text-sm text-white/50 uppercase tracking-wider">
        Commit-Reveal Betting Flow
      </p>
      <div className="flex flex-col gap-0 w-full">
        {steps.map((s, i) => (
          <div key={s.step} className="flex items-stretch gap-4">
            {/* Timeline */}
            <div className="flex flex-col items-center shrink-0">
              <div className="w-10 h-10 rounded-full border-2 border-white/40 flex items-center justify-center bg-void-deep">
                <span className="font-[family-name:var(--font-accent)] text-sm font-bold">{s.step}</span>
              </div>
              {i < steps.length - 1 && <div className="w-px flex-1 bg-white/15 min-h-[24px]" />}
            </div>
            {/* Content */}
            <div className="pb-6">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-[family-name:var(--font-display)] text-base font-semibold uppercase tracking-wider">
                  {s.title}
                </h3>
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/30 border border-white/15 rounded px-1.5 py-0.5">
                  {s.badge}
                </span>
              </div>
              <p className="font-[family-name:var(--font-body)] text-sm text-white/50 leading-relaxed">
                {s.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PrivacyModelSlide() {
  const rows = [
    { data: "Bet direction", contract: false, server: false, users: false },
    { data: "Salt", contract: false, server: false, users: false },
    { data: "Bet amount", contract: true, server: true, users: false },
    { data: "Who bet", contract: true, server: true, users: false },
    { data: "Total pool", contract: true, server: true, users: true },
  ]

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
      <h2 className="font-[family-name:var(--font-accent)] text-3xl sm:text-4xl font-bold tracking-widest text-glow">
        PRIVACY MODEL
      </h2>
      <p className="font-[family-name:var(--font-display)] text-sm text-white/50 uppercase tracking-wider text-center">
        What&apos;s hidden vs what&apos;s visible
      </p>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/15">
              <th className="font-[family-name:var(--font-display)] text-xs uppercase tracking-wider text-white/40 pb-3 pr-4">
                Data
              </th>
              <th className="font-[family-name:var(--font-display)] text-xs uppercase tracking-wider text-white/40 pb-3 px-4 text-center">
                Contract
              </th>
              <th className="font-[family-name:var(--font-display)] text-xs uppercase tracking-wider text-white/40 pb-3 px-4 text-center">
                Server
              </th>
              <th className="font-[family-name:var(--font-display)] text-xs uppercase tracking-wider text-white/40 pb-3 pl-4 text-center">
                Users
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.data} className="border-b border-white/5">
                <td className="font-[family-name:var(--font-body)] text-sm py-3 pr-4">{r.data}</td>
                <td className="text-center py-3 px-4">{r.contract ? <CheckIcon /> : <CrossIcon />}</td>
                <td className="text-center py-3 px-4">{r.server ? <CheckIcon /> : <CrossIcon />}</td>
                <td className="text-center py-3 pl-4">{r.users ? <CheckIcon /> : <CrossIcon />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 w-full mt-2">
        <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02]">
          <p className="font-[family-name:var(--font-mono)] text-xs text-white/40 leading-relaxed">
            commitment = keccak256(abi.encodePacked(direction, salt))
          </p>
          <p className="font-[family-name:var(--font-body)] text-xs text-white/30 mt-2">
            Binding: can&apos;t change direction after commit. Hiding: without the salt, commitment reveals nothing.
          </p>
        </div>
      </div>
    </div>
  )
}

function SocialLayerSlide() {
  const concepts = [
    { name: "Stars", meaning: "Users / Profiles", icon: "✦", detail: "Choose a star type, get username.voidmarket.eth" },
    { name: "Clusters", meaning: "Teams / Clans", icon: "◎", detail: "Create or join, max 50 members, invite system" },
    { name: "Novas", meaning: "Battles", icon: "✸", detail: "Cluster vs cluster, multi-round 1v1 matches" },
    { name: "Energy", meaning: "Team Score", icon: "⚡", detail: "On-chain cluster score, earned by winning Novas (+500)" },
    { name: "Photons", meaning: "Individual Score", icon: "◇", detail: "On-chain score per match — WIN = 100, LOSE = 25" },
    { name: "Forked Markets", meaning: "Private Markets", icon: "⑂", detail: "Derived from public markets, auto-resolve with parent" },
  ]

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
      <h2 className="font-[family-name:var(--font-accent)] text-3xl sm:text-4xl font-bold tracking-widest text-glow">
        SOCIAL LAYER
      </h2>
      <p className="font-[family-name:var(--font-display)] text-sm text-white/50 uppercase tracking-wider text-center">
        Galaxy-themed social system built on-chain
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {concepts.map((c) => (
          <div
            key={c.name}
            className="border border-white/10 rounded-xl p-4 bg-white/[0.02] hover:border-white/25 transition-colors duration-300"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl w-7 text-center">{c.icon}</span>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-wider">
                  {c.name}
                </h3>
                <p className="font-[family-name:var(--font-body)] text-[10px] text-white/30">{c.meaning}</p>
              </div>
            </div>
            <p className="font-[family-name:var(--font-body)] text-xs text-white/50 leading-relaxed pl-10">
              {c.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ArchitectureSlide() {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
      <h2 className="font-[family-name:var(--font-accent)] text-3xl sm:text-4xl font-bold tracking-widest text-glow">
        ARCHITECTURE
      </h2>
      <p className="font-[family-name:var(--font-display)] text-sm text-white/50 uppercase tracking-wider">
        Tech Stack
      </p>
      <div className="w-full flex flex-col gap-3">
        {/* Top: Telegram Mini App */}
        <div className="border border-white/20 rounded-xl p-4 bg-white/[0.03] text-center">
          <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-wider mb-1">
            Telegram Mini App
          </h3>
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-white/30">
            Next.js 16 &middot; React 19 &middot; Tailwind CSS 4 &middot; Telegram WebApp SDK
          </p>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <div className="w-px h-6 bg-white/20" />
        </div>

        {/* Middle: Circle */}
        <div className="border border-white/20 rounded-xl p-4 bg-white/[0.03] text-center">
          <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-wider mb-1">
            Circle Developer Wallets
          </h3>
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-white/30">
            Gasless UX &middot; Multi-chain &middot; CCTP Deposits
          </p>
        </div>

        {/* Arrow split */}
        <div className="flex justify-center">
          <div className="w-px h-6 bg-white/20" />
        </div>

        {/* Bottom: 3 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="border border-white/15 rounded-xl p-4 bg-white/[0.02]">
            <h3 className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-wider mb-2 text-center">
              Arc Testnet
            </h3>
            <div className="font-[family-name:var(--font-mono)] text-[10px] text-white/30 space-y-1">
              <p>Markets &amp; Bets</p>
              <p>Clusters &amp; Novas</p>
              <p>Energy &amp; Photons</p>
              <p>USDC Settlement</p>
            </div>
          </div>
          <div className="border border-white/15 rounded-xl p-4 bg-white/[0.02]">
            <h3 className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-wider mb-2 text-center">
              ENS (Sepolia)
            </h3>
            <div className="font-[family-name:var(--font-mono)] text-[10px] text-white/30 space-y-1">
              <p>CCIP-Read Gateway</p>
              <p>Wildcard Resolution</p>
              <p>*.voidmarket.eth</p>
              <p>Text Records</p>
            </div>
          </div>
          <div className="border border-white/15 rounded-xl p-4 bg-white/[0.02]">
            <h3 className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-wider mb-2 text-center">
              Circle CCTP
            </h3>
            <div className="font-[family-name:var(--font-mono)] text-[10px] text-white/30 space-y-1">
              <p>ETH → Arc</p>
              <p>Base → Arc</p>
              <p>Arb → Arc</p>
              <p>Native USDC</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CircleSlide() {
  const features = [
    {
      title: "Developer-Controlled Wallets",
      desc: "Every user gets a Circle wallet keyed to their Telegram ID. Server signs all transactions. Users never see gas or handle keys.",
    },
    {
      title: "CCTP Cross-Chain Deposits",
      desc: "Users deposit USDC from Ethereum, Base, Arbitrum, or any CCTP-supported chain. Burn on source, mint on Arc. One unified balance.",
    },
    {
      title: "Arc as Settlement Layer",
      desc: "USDC is the native gas token on Arc. Every bet, market, cluster, and Nova settles in USDC. No wrapping, no swapping, one currency.",
    },
    {
      title: "Gateway API",
      desc: "Unified balance queries across all chains. User sees one number regardless of where they deposited from.",
    },
  ]

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
      <div className="flex flex-col items-center gap-2">
        <p className="font-[family-name:var(--font-mono)] text-[10px] text-white/30 uppercase tracking-widest">
          Sponsor Integration
        </p>
        <h2 className="font-[family-name:var(--font-accent)] text-3xl sm:text-4xl font-bold tracking-widest text-glow">
          CIRCLE
        </h2>
        <p className="font-[family-name:var(--font-display)] text-sm text-white/50 uppercase tracking-wider">
          Bridge Kit + Arc
        </p>
      </div>
      <div className="flex flex-col gap-4 w-full">
        {features.map((f) => (
          <div
            key={f.title}
            className="border border-white/10 rounded-xl p-5 bg-white/[0.02] hover:border-white/25 transition-colors duration-300"
          >
            <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-wider mb-2">
              {f.title}
            </h3>
            <p className="font-[family-name:var(--font-body)] text-xs text-white/50 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ENSSlide() {
  const features = [
    {
      title: "Zero-Gas Subdomains via CCIP-Read",
      desc: "Every Star, Market, and Cluster gets a *.voidmarket.eth subdomain. No on-chain minting — stored in PostgreSQL, resolved via gateway, verified on-chain. Cost for 1000 users: $0.",
    },
    {
      title: "Wildcard Resolution (ENSIP-10)",
      desc: "Single resolver handles all subdomains. Stars, markets, and clusters resolved by priority. Nested subdomains for forked markets: eth-5k.darth.voidmarket.eth.",
    },
    {
      title: "Text Records for DeFi",
      desc: "ENS records include: star type, photons, cluster membership, market question, pool size, status, bet counts. Full prediction market metadata via standard ENS queries.",
    },
    {
      title: "Portable Betting Reputation",
      desc: "Your win/loss record, photon score, and cluster membership travel with your ENS name. Any ENS-aware app can read your VoidMarket profile.",
    },
  ]

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
      <div className="flex flex-col items-center gap-2">
        <p className="font-[family-name:var(--font-mono)] text-[10px] text-white/30 uppercase tracking-widest">
          Sponsor Integration
        </p>
        <h2 className="font-[family-name:var(--font-accent)] text-3xl sm:text-4xl font-bold tracking-widest text-glow">
          ENS
        </h2>
        <p className="font-[family-name:var(--font-display)] text-sm text-white/50 uppercase tracking-wider">
          Identity Layer
        </p>
      </div>
      <div className="flex flex-col gap-4 w-full">
        {features.map((f) => (
          <div
            key={f.title}
            className="border border-white/10 rounded-xl p-5 bg-white/[0.02] hover:border-white/25 transition-colors duration-300"
          >
            <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-wider mb-2">
              {f.title}
            </h3>
            <p className="font-[family-name:var(--font-body)] text-xs text-white/50 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
      <div className="border border-white/20 rounded-lg p-3 bg-white/[0.03] w-full text-center">
        <p className="font-[family-name:var(--font-display)] text-xs text-white/60 uppercase tracking-wider">
          ENS is not an afterthought — it IS the identity layer
        </p>
      </div>
    </div>
  )
}

function SmartContractsSlide() {
  const contracts = [
    {
      name: "VoidMarketCore",
      purpose: "Markets, commit-reveal betting, forked markets (auto-resolve), payouts",
    },
    {
      name: "ClusterManager",
      purpose: "Teams, invites (7-day codes), photon/energy on-chain scoring",
    },
    {
      name: "NovaManager",
      purpose: "Cluster battles, 3 matches/round, linked prediction markets per match",
    },
    {
      name: "VoidMarketResolver",
      purpose: "ENS CCIP-Read resolver (deployed on Sepolia + Arc)",
    },
  ]

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
      <h2 className="font-[family-name:var(--font-accent)] text-3xl sm:text-4xl font-bold tracking-widest text-glow">
        SMART CONTRACTS
      </h2>
      <p className="font-[family-name:var(--font-display)] text-sm text-white/50 uppercase tracking-wider">
        Arc Testnet + Sepolia
      </p>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/15">
              <th className="font-[family-name:var(--font-display)] text-xs uppercase tracking-wider text-white/40 pb-3 pr-4">
                Contract
              </th>
              <th className="font-[family-name:var(--font-display)] text-xs uppercase tracking-wider text-white/40 pb-3">
                Purpose
              </th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c.name} className="border-b border-white/5">
                <td className="font-[family-name:var(--font-mono)] text-sm py-3 pr-4 text-white/80 whitespace-nowrap">
                  {c.name}
                </td>
                <td className="font-[family-name:var(--font-body)] text-sm text-white/50 py-3">{c.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full mt-2">
        <div className="border border-white/10 rounded-xl p-4 bg-white/[0.02] text-center">
          <p className="font-[family-name:var(--font-accent)] text-2xl font-bold text-glow-soft">~2,500</p>
          <p className="font-[family-name:var(--font-display)] text-[10px] text-white/40 uppercase tracking-wider mt-1">
            Lines of Solidity
          </p>
        </div>
        <div className="border border-white/10 rounded-xl p-4 bg-white/[0.02] text-center">
          <p className="font-[family-name:var(--font-accent)] text-2xl font-bold text-glow-soft">~150</p>
          <p className="font-[family-name:var(--font-display)] text-[10px] text-white/40 uppercase tracking-wider mt-1">
            Unit Tests
          </p>
        </div>
      </div>
    </div>
  )
}

function TechnicalNoveltySlide() {
  const novelties = [
    {
      num: "01",
      text: "First prediction market where you can't see the bet distribution. All bets go through commit-reveal. Pool size is visible but positions are hidden.",
    },
    {
      num: "02",
      text: "Prediction markets as ENS names. Markets are resolvable ENS subdomains. eth-5k.voidmarket.eth returns pool size, status, and deadline via standard ENS text records.",
    },
    {
      num: "03",
      text: "Nested ENS subdomains for forked markets. eth-5k.darth.voidmarket.eth — three levels of ENS hierarchy serving actual DeFi data.",
    },
    {
      num: "04",
      text: "Team-based prediction market competitions. Cluster battles where each 1v1 match creates a real linked prediction market on-chain.",
    },
    {
      num: "05",
      text: "Truly gasless Telegram UX on a single currency. USDC is native gas on Arc. Circle wallets sign everything. Zero points where gas surfaces.",
    },
  ]

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
      <h2 className="font-[family-name:var(--font-accent)] text-3xl sm:text-4xl font-bold tracking-widest text-glow">
        TECHNICAL NOVELTY
      </h2>
      <p className="font-[family-name:var(--font-display)] text-sm text-white/50 uppercase tracking-wider">
        What&apos;s new here
      </p>
      <div className="flex flex-col gap-4 w-full">
        {novelties.map((n) => (
          <div key={n.num} className="flex items-start gap-4">
            <span className="font-[family-name:var(--font-accent)] text-lg font-black text-white/15 shrink-0 w-8 text-right">
              {n.num}
            </span>
            <p className="font-[family-name:var(--font-body)] text-sm text-white/60 leading-relaxed">{n.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function BuiltDuringSlide() {
  const stats = [
    { value: "~2,500", label: "Lines of Solidity" },
    { value: "~150", label: "Unit Tests" },
    { value: "83+", label: "Gateway Tests" },
    { value: "19+", label: "API Routes" },
    { value: "11", label: "Pages" },
    { value: "4", label: "Smart Contracts" },
  ]

  const built = [
    "VoidMarketCore — commit-reveal betting, forked markets with cascading resolution",
    "ClusterManager — team system with on-chain photon/energy scoring",
    "NovaManager — cluster battles with linked prediction markets per match",
    "VoidMarketResolver — custom CCIP-Read resolver on Sepolia + Arc",
    "ENS Gateway — Express.js CCIP-Read server with DNS decoder & EIP-191 signer",
    "Frontend — Next.js 16 Telegram Mini App with Circle SDK + commit-reveal flow",
  ]

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
      <h2 className="font-[family-name:var(--font-accent)] text-3xl sm:text-4xl font-bold tracking-widest text-glow">
        BUILT DURING HACKATHON
      </h2>
      <p className="font-[family-name:var(--font-display)] text-sm text-white/50 uppercase tracking-wider">
        Everything from scratch in one hackathon
      </p>
      <div className="grid grid-cols-3 gap-3 w-full">
        {stats.map((s) => (
          <div key={s.label} className="border border-white/10 rounded-xl p-3 bg-white/[0.02] text-center">
            <p className="font-[family-name:var(--font-accent)] text-xl sm:text-2xl font-bold text-glow-soft">
              {s.value}
            </p>
            <p className="font-[family-name:var(--font-display)] text-[9px] sm:text-[10px] text-white/40 uppercase tracking-wider mt-1">
              {s.label}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 w-full">
        {built.map((b, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="text-white/20 shrink-0 mt-0.5">—</span>
            <p className="font-[family-name:var(--font-body)] text-xs text-white/50 leading-relaxed">{b}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-col items-center gap-2">
        <VoidLogo size="md" />
        <p className="font-[family-name:var(--font-accent)] text-lg tracking-widest text-white/60">VOIDMARKET</p>
        <p className="font-[family-name:var(--font-body)] text-xs text-white/30">
          Your bet goes into the void.
        </p>
      </div>
    </div>
  )
}

/* ─── Dot Navigation ──────────────────────────────────────── */

function DotNav({ active, total, onDotClick }: { active: number; total: number; onDotClick: (i: number) => void }) {
  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2.5">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onDotClick(i)}
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            i === active ? "bg-white scale-125 shadow-[0_0_6px_rgba(255,255,255,0.5)]" : "bg-white/20 hover:bg-white/40"
          }`}
          aria-label={`Go to slide ${i + 1}`}
        />
      ))}
    </div>
  )
}

/* ─── Main Page ───────────────────────────────────────────── */

const SLIDES = [
  TitleSlide,
  ProblemSlide,
  SolutionSlide,
  HowItWorksSlide,
  PrivacyModelSlide,
  SocialLayerSlide,
  ArchitectureSlide,
  CircleSlide,
  ENSSlide,
  SmartContractsSlide,
  TechnicalNoveltySlide,
  BuiltDuringSlide,
]

export default function PitchPage() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [visibleSlides, setVisibleSlides] = useState<Set<number>>(new Set([0]))
  const containerRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])

  const setSlideRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    slideRefs.current[index] = el
  }, [])

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    slideRefs.current.forEach((el, i) => {
      if (!el) return

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSlide(i)
            setVisibleSlides((prev) => {
              const next = new Set(prev)
              next.add(i)
              return next
            })
          }
        },
        { threshold: 0.5 }
      )

      observer.observe(el)
      observers.push(observer)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, [])

  const handleDotClick = (i: number) => {
    slideRefs.current[i]?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-auto snap-y snap-mandatory scrollbar-hide"
    >
      <DotNav active={activeSlide} total={SLIDE_COUNT} onDotClick={handleDotClick} />

      {SLIDES.map((SlideComponent, i) => (
        <div
          key={i}
          ref={setSlideRef(i)}
          className="min-h-screen snap-start snap-always flex items-center justify-center px-6 py-12 sm:px-8"
        >
          <div
            className={`w-full max-w-4xl mx-auto transition-all duration-700 ${
              visibleSlides.has(i) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <SlideComponent />
          </div>
        </div>
      ))}
    </div>
  )
}
