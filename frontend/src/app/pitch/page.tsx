"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { VoidLogo } from "@/components/ui/void-logo"

const SLIDE_COUNT = 12

/* ─── Utility Icons (Privacy Table) ─────────────────────── */

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="inline-block">
      <circle cx="9" cy="9" r="8" stroke="#22c55e" strokeOpacity="0.3" strokeWidth="1" />
      <path d="M5 9l2.5 2.5L13 6" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="inline-block">
      <circle cx="9" cy="9" r="8" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
      <path d="M6 6l6 6M12 6l-6 6" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/* ─── Slide 1: Title ─────────────────────────────────────── */

function TitleSlide() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 text-center">
      {/* Orbital Rings surrounding VoidLogo */}
      <div className="relative w-52 h-52 sm:w-72 sm:h-72">
        <div className="absolute inset-0 animate-[spin_45s_linear_infinite]">
          <svg viewBox="0 0 400 400" className="w-full h-full" fill="none">
            <ellipse cx="200" cy="200" rx="195" ry="72" stroke="white" strokeOpacity="0.07" strokeWidth="0.8" />
          </svg>
        </div>
        <div className="absolute inset-0 rotate-[55deg] animate-[spin_38s_linear_infinite_reverse]">
          <svg viewBox="0 0 400 400" className="w-full h-full" fill="none">
            <ellipse cx="200" cy="200" rx="185" ry="65" stroke="white" strokeOpacity="0.1" strokeWidth="0.8" />
          </svg>
        </div>
        <div className="absolute inset-0 rotate-[-25deg] animate-[spin_30s_linear_infinite]">
          <svg viewBox="0 0 400 400" className="w-full h-full" fill="none">
            <ellipse cx="200" cy="200" rx="160" ry="55" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
          </svg>
        </div>
        <div className="absolute inset-0 rotate-[110deg] animate-[spin_24s_linear_infinite_reverse]">
          <svg viewBox="0 0 400 400" className="w-full h-full" fill="none">
            <ellipse cx="200" cy="200" rx="130" ry="48" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
          </svg>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <VoidLogo size="xl" />
        </div>
      </div>

      <h1 className="font-[family-name:var(--font-accent)] text-5xl sm:text-7xl font-black tracking-[0.2em] text-glow">
        VOIDMARKET
      </h1>
      <p className="font-[family-name:var(--font-display)] text-lg sm:text-xl text-white/80 max-w-xl tracking-wide uppercase">
        Private prediction markets inside Telegram
      </p>
      <p className="font-[family-name:var(--font-body)] text-sm text-white/60 tracking-wide">
        Your bet goes into the void.
      </p>
      <div className="mt-4 flex flex-col items-center gap-2">
        <p className="font-[family-name:var(--font-body)] text-xs text-white/50 uppercase tracking-widest">
          ETHGlobal HackMoney 2026
        </p>
        <p className="font-[family-name:var(--font-body)] text-xs text-white/50">
          Solo build by <span className="text-white/80">Darth Stormer</span>
        </p>
      </div>
      <div className="mt-8">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="animate-bounce">
          <path d="M10 4v12m0 0l-4-4m4 4l4-4" stroke="white" strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}

/* ─── Slide 2: Problem ───────────────────────────────────── */

function ProblemSlide() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl">
      <h2 className="font-[family-name:var(--font-accent)] text-3xl sm:text-4xl font-bold tracking-widest text-glow text-center">
        THE PROBLEM
      </h2>
      <p className="font-[family-name:var(--font-display)] text-sm text-white/60 uppercase tracking-wider text-center mb-4">
        Prediction markets today are broken
      </p>

      <div className="flex items-baseline gap-5 sm:gap-6">
        <span className="font-[family-name:var(--font-accent)] text-5xl sm:text-7xl font-black text-white/8 leading-none shrink-0">
          01
        </span>
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-semibold uppercase tracking-wider mb-2">
            Public Bets = Herding
          </h3>
          <p className="font-[family-name:var(--font-body)] text-sm sm:text-base text-white/80 leading-relaxed">
            Everyone sees the YES/NO split in real time. Late bettors piggyback on early positions. Whales counter-trade. The market itself becomes the signal, not the outcome.
          </p>
        </div>
      </div>

      <hr className="border-white/15" />

      <div className="flex items-baseline gap-5 sm:gap-6">
        <span className="font-[family-name:var(--font-accent)] text-5xl sm:text-7xl font-black text-white/8 leading-none shrink-0">
          02
        </span>
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-semibold uppercase tracking-wider mb-2">
            Terrible UX
          </h3>
          <p className="font-[family-name:var(--font-body)] text-sm sm:text-base text-white/80 leading-relaxed">
            You need a wallet, ETH for gas, token approvals, and deep crypto knowledge. Your friend in a Telegram group is never going to do all that to bet $5.
          </p>
        </div>
      </div>

      <hr className="border-white/15" />

      <div className="flex items-baseline gap-5 sm:gap-6">
        <span className="font-[family-name:var(--font-accent)] text-5xl sm:text-7xl font-black text-white/8 leading-none shrink-0">
          03
        </span>
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-semibold uppercase tracking-wider mb-2">
            No Social Layer
          </h3>
          <p className="font-[family-name:var(--font-body)] text-sm sm:text-base text-white/80 leading-relaxed">
            Betting is more fun with friends. No way to fork a market for a private group bet, compete as teams, or build betting reputation that travels with you.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─── Slide 3: Solution ──────────────────────────────────── */

function SolutionSlide() {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl">
      <h2 className="font-[family-name:var(--font-accent)] text-3xl sm:text-4xl font-bold tracking-widest text-glow">
        THE SOLUTION
      </h2>
      <p className="font-[family-name:var(--font-display)] text-sm text-white/60 uppercase tracking-wider text-center">
        A Telegram Mini App where bets are private, UX is gasless, and identity is portable
      </p>

      {/* Orbit Diagram */}
      <div className="relative w-full max-w-md sm:max-w-lg aspect-square mx-auto">
        <svg viewBox="0 0 500 500" className="absolute inset-0 w-full h-full" fill="none">
          {/* Orbital rings */}
          <circle cx="250" cy="250" r="170" stroke="white" strokeOpacity="0.06" strokeWidth="1" strokeDasharray="6 8" />
          <circle cx="250" cy="250" r="120" stroke="white" strokeOpacity="0.1" strokeWidth="1" />

          {/* Connecting lines from center to pillars */}
          <line x1="250" y1="195" x2="250" y2="105" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
          <line x1="305" y1="250" x2="395" y2="250" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
          <line x1="250" y1="305" x2="250" y2="395" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
          <line x1="195" y1="250" x2="105" y2="250" stroke="white" strokeOpacity="0.15" strokeWidth="1" />

          {/* Center void */}
          <circle cx="250" cy="250" r="55" fill="white" fillOpacity="0.02" stroke="white" strokeOpacity="0.25" strokeWidth="2" />
          <text x="250" y="246" textAnchor="middle" fill="white" fillOpacity="0.5" fontSize="13" fontFamily="monospace" letterSpacing="3">VOID</text>
          <text x="250" y="263" textAnchor="middle" fill="white" fillOpacity="0.5" fontSize="13" fontFamily="monospace" letterSpacing="3">MARKET</text>

          {/* ── Top: Private Betting ── */}
          <circle cx="250" cy="80" r="30" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
          {/* Lock icon */}
          <rect x="242" y="76" width="16" height="12" rx="2" stroke="white" strokeOpacity="0.8" strokeWidth="1.5" fill="none" />
          <path d="M246 76v-5a4 4 0 0 1 8 0v5" stroke="white" strokeOpacity="0.8" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <text x="250" y="130" textAnchor="middle" fill="white" fillOpacity="0.9" fontSize="13" fontWeight="600" letterSpacing="1.5">PRIVATE BETTING</text>
          <text x="250" y="148" textAnchor="middle" fill="white" fillOpacity="0.5" fontSize="10">Commit-reveal hides your bet</text>

          {/* ── Right: Zero Friction ── */}
          <circle cx="420" cy="250" r="30" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
          {/* Lightning icon */}
          <path d="M424 237l-8 13h7l-3 13 10-15h-7l3-11z" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.8" strokeWidth="1.2" strokeLinejoin="round" />
          <text x="420" y="300" textAnchor="middle" fill="white" fillOpacity="0.9" fontSize="13" fontWeight="600" letterSpacing="1.5">ZERO FRICTION</text>
          <text x="420" y="318" textAnchor="middle" fill="white" fillOpacity="0.5" fontSize="10">No wallet, no gas, just tap</text>

          {/* ── Bottom: Social Wagering ── */}
          <circle cx="250" cy="420" r="30" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
          {/* People icon */}
          <circle cx="244" cy="413" r="5" stroke="white" strokeOpacity="0.8" strokeWidth="1.2" fill="none" />
          <path d="M234 428a10 10 0 0 1 20 0" stroke="white" strokeOpacity="0.8" strokeWidth="1.2" fill="none" />
          <circle cx="259" cy="414" r="4" stroke="white" strokeOpacity="0.5" strokeWidth="1" fill="none" />
          <path d="M252 427a7.5 7.5 0 0 1 15 0" stroke="white" strokeOpacity="0.5" strokeWidth="1" fill="none" />
          <text x="250" y="468" textAnchor="middle" fill="white" fillOpacity="0.9" fontSize="13" fontWeight="600" letterSpacing="1.5">SOCIAL WAGERING</text>
          <text x="250" y="486" textAnchor="middle" fill="white" fillOpacity="0.5" fontSize="10">Teams, battles, leaderboards</text>

          {/* ── Left: Portable Identity ── */}
          <circle cx="80" cy="250" r="30" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
          {/* Globe icon */}
          <circle cx="80" cy="250" r="13" stroke="white" strokeOpacity="0.8" strokeWidth="1.2" fill="none" />
          <ellipse cx="80" cy="250" rx="6" ry="13" stroke="white" strokeOpacity="0.4" strokeWidth="0.8" fill="none" />
          <line x1="67" y1="250" x2="93" y2="250" stroke="white" strokeOpacity="0.4" strokeWidth="0.8" />
          <line x1="80" y1="237" x2="80" y2="263" stroke="white" strokeOpacity="0.4" strokeWidth="0.8" />
          <text x="80" y="300" textAnchor="middle" fill="white" fillOpacity="0.9" fontSize="13" fontWeight="600" letterSpacing="1.5">PORTABLE ID</text>
          <text x="80" y="318" textAnchor="middle" fill="white" fillOpacity="0.5" fontSize="10">*.voidmarket.eth via ENS</text>
        </svg>
      </div>
    </div>
  )
}

/* ─── Slide 4: How It Works ──────────────────────────────── */

function HowItWorksSlide() {
  const steps = [
    { step: "1", title: "Place Bet", desc: "Pick YES or NO. Frontend generates commitment hash. Salt stored in Telegram Cloud Storage.", badge: "CLIENT" },
    { step: "2", title: "Hidden On-Chain", desc: "Circle wallet signs tx. Only commitment goes on-chain. Direction stays hidden.", badge: "ON-CHAIN" },
    { step: "3", title: "Resolve", desc: "Admin/oracle sets outcome. All forked markets auto-resolve. Bettors notified.", badge: "ORACLE" },
    { step: "4", title: "Reveal & Claim", desc: "Contract verifies hash matches commitment. Winners claim bet + share of losers' pool.", badge: "ON-CHAIN" },
  ]

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl">
      <h2 className="font-[family-name:var(--font-accent)] text-3xl sm:text-4xl font-bold tracking-widest text-glow">
        HOW IT WORKS
      </h2>
      <p className="font-[family-name:var(--font-display)] text-sm text-white/60 uppercase tracking-wider">
        Commit-Reveal Betting Flow
      </p>

      {/* Horizontal flow (desktop) / Vertical flow (mobile) */}
      <div className="flex flex-col sm:flex-row items-stretch gap-0 w-full">
        {steps.map((s, i) => (
          <div key={s.step} className="flex flex-col sm:flex-row items-center flex-1">
            {/* Step card */}
            <div className="flex flex-col items-center text-center px-2 sm:px-3 w-full">
              {/* Circle badge */}
              <div className="w-14 h-14 rounded-full border-2 border-white/30 flex items-center justify-center bg-void-deep shrink-0">
                <span className="font-[family-name:var(--font-accent)] text-lg font-bold">{s.step}</span>
              </div>
              {/* Badge */}
              <span className="font-[family-name:var(--font-mono)] text-[9px] text-white/50 border border-white/20 rounded px-1.5 py-0.5 mt-3 uppercase tracking-wider">
                {s.badge}
              </span>
              {/* Title */}
              <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-wider mt-3">
                {s.title}
              </h3>
              {/* Description */}
              <p className="font-[family-name:var(--font-body)] text-xs text-white/70 leading-relaxed mt-2 max-w-[180px]">
                {s.desc}
              </p>
            </div>

            {/* Arrow connector */}
            {i < steps.length - 1 && (
              <>
                {/* Desktop: horizontal arrow */}
                <svg className="hidden sm:block w-8 h-8 shrink-0 mx-1" viewBox="0 0 32 32" fill="none">
                  <path d="M4 16h24" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M22 10l6 6-6 6" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {/* Mobile: vertical arrow */}
                <svg className="sm:hidden w-8 h-8 shrink-0 my-2" viewBox="0 0 32 32" fill="none">
                  <path d="M16 4v24" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M10 22l6 6 6-6" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Slide 5: Privacy Model ─────────────────────────────── */

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
      <p className="font-[family-name:var(--font-display)] text-sm text-white/60 uppercase tracking-wider text-center">
        What&apos;s hidden vs what&apos;s visible
      </p>

      {/* Shield Illustration */}
      <svg viewBox="0 0 200 160" className="w-32 sm:w-40 h-auto" fill="none">
        {/* Shield shape */}
        <path
          d="M100 10 L170 40 L170 90 Q170 140 100 155 Q30 140 30 90 L30 40 Z"
          stroke="white" strokeOpacity="0.3" strokeWidth="2" fill="white" fillOpacity="0.03"
        />
        <path
          d="M100 25 L155 48 L155 88 Q155 128 100 142 Q45 128 45 88 L45 48 Z"
          stroke="white" strokeOpacity="0.15" strokeWidth="1" fill="none"
        />
        {/* Lock inside shield */}
        <rect x="85" y="78" width="30" height="24" rx="4" stroke="white" strokeOpacity="0.6" strokeWidth="2" fill="white" fillOpacity="0.05" />
        <path d="M92 78v-10a8 8 0 0 1 16 0v10" stroke="white" strokeOpacity="0.6" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="100" cy="90" r="3" fill="white" fillOpacity="0.5" />
      </svg>

      {/* Visibility Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/20">
              <th className="font-[family-name:var(--font-display)] text-xs uppercase tracking-wider text-white/50 pb-3 pr-4">
                Data
              </th>
              <th className="font-[family-name:var(--font-display)] text-xs uppercase tracking-wider text-white/50 pb-3 px-4 text-center">
                Contract
              </th>
              <th className="font-[family-name:var(--font-display)] text-xs uppercase tracking-wider text-white/50 pb-3 px-4 text-center">
                Server
              </th>
              <th className="font-[family-name:var(--font-display)] text-xs uppercase tracking-wider text-white/50 pb-3 pl-4 text-center">
                Users
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.data} className="border-b border-white/8">
                <td className="font-[family-name:var(--font-body)] text-sm text-white/90 py-3 pr-4">{r.data}</td>
                <td className="text-center py-3 px-4">{r.contract ? <CheckIcon /> : <CrossIcon />}</td>
                <td className="text-center py-3 px-4">{r.server ? <CheckIcon /> : <CrossIcon />}</td>
                <td className="text-center py-3 pl-4">{r.users ? <CheckIcon /> : <CrossIcon />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Formula callout */}
      <div className="rounded-lg p-4 bg-void-surface border border-white/15 w-full">
        <p className="font-[family-name:var(--font-mono)] text-xs text-white/70 leading-relaxed">
          commitment = keccak256(abi.encodePacked(direction, salt))
        </p>
        <p className="font-[family-name:var(--font-body)] text-xs text-white/50 mt-2">
          Binding: can&apos;t change direction after commit. Hiding: without the salt, commitment reveals nothing.
        </p>
      </div>
    </div>
  )
}

/* ─── Slide 6: Social Layer ──────────────────────────────── */

function SocialLayerSlide() {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl">
      <h2 className="font-[family-name:var(--font-accent)] text-3xl sm:text-4xl font-bold tracking-widest text-glow">
        SOCIAL LAYER
      </h2>
      <p className="font-[family-name:var(--font-display)] text-sm text-white/60 uppercase tracking-wider text-center">
        Galaxy-themed social system built on-chain
      </p>

      {/* Constellation Diagram */}
      <svg viewBox="0 0 700 380" className="w-full max-w-2xl h-auto" fill="none">
        {/* Connecting lines */}
        <line x1="130" y1="100" x2="300" y2="100" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
        <line x1="300" y1="100" x2="500" y2="100" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
        <line x1="130" y1="100" x2="130" y2="280" stroke="white" strokeOpacity="0.1" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="300" y1="100" x2="300" y2="280" stroke="white" strokeOpacity="0.1" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="500" y1="100" x2="570" y2="200" stroke="white" strokeOpacity="0.1" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="500" y1="100" x2="570" y2="300" stroke="white" strokeOpacity="0.1" strokeWidth="1" strokeDasharray="4 4" />

        {/* ── Stars (Users) ── */}
        <circle cx="130" cy="100" r="28" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
        {/* 4-pointed star icon */}
        <path d="M130 78l3 14 14 3-14 3-3 14-3-14-14-3 14-3z" fill="white" fillOpacity="0.3" stroke="white" strokeOpacity="0.5" strokeWidth="0.8" />
        <text x="130" y="145" textAnchor="middle" fill="white" fillOpacity="0.9" fontSize="13" fontWeight="600" letterSpacing="1.5">STARS</text>
        <text x="130" y="162" textAnchor="middle" fill="white" fillOpacity="0.5" fontSize="10">Users / Profiles</text>

        {/* ── Clusters (Teams) ── */}
        <circle cx="300" cy="100" r="28" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
        {/* Target/cluster icon */}
        <circle cx="300" cy="100" r="14" stroke="white" strokeOpacity="0.5" strokeWidth="1" fill="none" />
        <circle cx="300" cy="100" r="7" stroke="white" strokeOpacity="0.4" strokeWidth="1" fill="none" />
        <circle cx="300" cy="100" r="2.5" fill="white" fillOpacity="0.5" />
        <text x="300" y="145" textAnchor="middle" fill="white" fillOpacity="0.9" fontSize="13" fontWeight="600" letterSpacing="1.5">CLUSTERS</text>
        <text x="300" y="162" textAnchor="middle" fill="white" fillOpacity="0.5" fontSize="10">Teams / Clans</text>

        {/* ── Novas (Battles) ── */}
        <circle cx="500" cy="100" r="28" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
        {/* Burst/nova icon */}
        <path d="M500 78l2 10 8-6-4 9 10 2-10 2 4 9-8-6-2 10-2-10-8 6 4-9-10-2 10-2-4-9 8 6z" fill="white" fillOpacity="0.25" stroke="white" strokeOpacity="0.5" strokeWidth="0.6" />
        <text x="500" y="145" textAnchor="middle" fill="white" fillOpacity="0.9" fontSize="13" fontWeight="600" letterSpacing="1.5">NOVAS</text>
        <text x="500" y="162" textAnchor="middle" fill="white" fillOpacity="0.5" fontSize="10">Battles</text>

        {/* ── Photons (Individual Score) ── */}
        <circle cx="130" cy="280" r="22" fill="white" fillOpacity="0.03" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
        {/* Diamond icon */}
        <path d="M130 265l10 10-10 10-10-10z" stroke="white" strokeOpacity="0.5" strokeWidth="1" fill="white" fillOpacity="0.1" />
        <text x="130" y="318" textAnchor="middle" fill="white" fillOpacity="0.8" fontSize="12" fontWeight="600" letterSpacing="1">PHOTONS</text>
        <text x="130" y="333" textAnchor="middle" fill="white" fillOpacity="0.45" fontSize="9">Individual Score</text>
        <text x="130" y="348" textAnchor="middle" fill="white" fillOpacity="0.35" fontSize="9">WIN=100 LOSE=25</text>

        {/* ── Energy (Team Score) ── */}
        <circle cx="300" cy="280" r="22" fill="white" fillOpacity="0.03" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
        {/* Bolt icon */}
        <path d="M303 268l-6 10h5l-2 10 7-12h-5l3-8z" stroke="white" strokeOpacity="0.5" strokeWidth="1" fill="white" fillOpacity="0.1" />
        <text x="300" y="318" textAnchor="middle" fill="white" fillOpacity="0.8" fontSize="12" fontWeight="600" letterSpacing="1">ENERGY</text>
        <text x="300" y="333" textAnchor="middle" fill="white" fillOpacity="0.45" fontSize="9">Team Score</text>
        <text x="300" y="348" textAnchor="middle" fill="white" fillOpacity="0.35" fontSize="9">Nova Win = +500</text>

        {/* ── Forked Markets ── */}
        <circle cx="570" cy="200" r="22" fill="white" fillOpacity="0.03" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
        {/* Fork icon */}
        <path d="M565 192v16M575 192v8M575 200a5 5 0 0 1-5 5" stroke="white" strokeOpacity="0.5" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <circle cx="565" cy="190" r="2" fill="white" fillOpacity="0.4" />
        <circle cx="575" cy="190" r="2" fill="white" fillOpacity="0.4" />
        <circle cx="565" cy="210" r="2" fill="white" fillOpacity="0.4" />
        <text x="570" y="237" textAnchor="middle" fill="white" fillOpacity="0.8" fontSize="12" fontWeight="600" letterSpacing="1">FORKED</text>
        <text x="570" y="252" textAnchor="middle" fill="white" fillOpacity="0.8" fontSize="12" fontWeight="600" letterSpacing="1">MARKETS</text>
        <text x="570" y="267" textAnchor="middle" fill="white" fillOpacity="0.45" fontSize="9">Private Markets</text>

        {/* Flow arrows on main path */}
        <path d="M165 100l6-4v8z" fill="white" fillOpacity="0.25" />
        <path d="M340 100l6-4v8z" fill="white" fillOpacity="0.25" />
      </svg>
    </div>
  )
}

/* ─── Slide 7: Architecture ──────────────────────────────── */

function ArchitectureSlide() {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-4xl">
      <h2 className="font-[family-name:var(--font-accent)] text-3xl sm:text-4xl font-bold tracking-widest text-glow">
        ARCHITECTURE
      </h2>
      <p className="font-[family-name:var(--font-display)] text-sm text-white/60 uppercase tracking-wider">
        Tech Stack
      </p>

      {/* SVG Flowchart */}
      <svg viewBox="0 0 720 440" className="w-full max-w-2xl h-auto" fill="none">
        {/* ── Top: Telegram Mini App ── */}
        <rect x="220" y="10" width="280" height="60" rx="8" stroke="white" strokeOpacity="0.35" strokeWidth="1.5" fill="white" fillOpacity="0.04" />
        <text x="360" y="35" textAnchor="middle" fill="white" fillOpacity="0.9" fontSize="14" fontWeight="600" letterSpacing="2">TELEGRAM MINI APP</text>
        <text x="360" y="55" textAnchor="middle" fill="white" fillOpacity="0.45" fontSize="10" fontFamily="monospace">Next.js 16 / React 19 / Tailwind 4</text>

        {/* Arrow down */}
        <line x1="360" y1="70" x2="360" y2="120" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" />
        <path d="M360 120l-5-8h10z" fill="white" fillOpacity="0.25" />

        {/* ── Middle: Circle ── */}
        <rect x="220" y="125" width="280" height="60" rx="8" stroke="white" strokeOpacity="0.35" strokeWidth="1.5" fill="white" fillOpacity="0.04" />
        <text x="360" y="150" textAnchor="middle" fill="white" fillOpacity="0.9" fontSize="14" fontWeight="600" letterSpacing="2">CIRCLE WALLETS</text>
        <text x="360" y="170" textAnchor="middle" fill="white" fillOpacity="0.45" fontSize="10" fontFamily="monospace">Gasless UX / Multi-chain / CCTP</text>

        {/* Arrow splits to three */}
        <line x1="360" y1="185" x2="360" y2="215" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" />
        <line x1="360" y1="215" x2="120" y2="260" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
        <line x1="360" y1="215" x2="360" y2="260" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
        <line x1="360" y1="215" x2="600" y2="260" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
        {/* Arrow tips */}
        <path d="M120 260l2-9 6 6z" fill="white" fillOpacity="0.2" />
        <path d="M360 260l-4-8h8z" fill="white" fillOpacity="0.2" />
        <path d="M600 260l-6 6 2-9z" fill="white" fillOpacity="0.2" />

        {/* ── Bottom Left: Arc Testnet ── */}
        <rect x="30" y="265" width="180" height="150" rx="8" stroke="white" strokeOpacity="0.25" strokeWidth="1" fill="white" fillOpacity="0.03" />
        <text x="120" y="290" textAnchor="middle" fill="white" fillOpacity="0.85" fontSize="13" fontWeight="600" letterSpacing="1.5">ARC TESTNET</text>
        <line x1="50" y1="300" x2="190" y2="300" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
        <text x="120" y="320" textAnchor="middle" fill="white" fillOpacity="0.45" fontSize="10" fontFamily="monospace">Markets &amp; Bets</text>
        <text x="120" y="338" textAnchor="middle" fill="white" fillOpacity="0.45" fontSize="10" fontFamily="monospace">Clusters &amp; Novas</text>
        <text x="120" y="356" textAnchor="middle" fill="white" fillOpacity="0.45" fontSize="10" fontFamily="monospace">Energy &amp; Photons</text>
        <text x="120" y="374" textAnchor="middle" fill="white" fillOpacity="0.45" fontSize="10" fontFamily="monospace">USDC Settlement</text>

        {/* ── Bottom Center: ENS ── */}
        <rect x="270" y="265" width="180" height="150" rx="8" stroke="white" strokeOpacity="0.25" strokeWidth="1" fill="white" fillOpacity="0.03" />
        <text x="360" y="290" textAnchor="middle" fill="white" fillOpacity="0.85" fontSize="13" fontWeight="600" letterSpacing="1.5">ENS (SEPOLIA)</text>
        <line x1="290" y1="300" x2="430" y2="300" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
        <text x="360" y="320" textAnchor="middle" fill="white" fillOpacity="0.45" fontSize="10" fontFamily="monospace">CCIP-Read Gateway</text>
        <text x="360" y="338" textAnchor="middle" fill="white" fillOpacity="0.45" fontSize="10" fontFamily="monospace">Wildcard Resolution</text>
        <text x="360" y="356" textAnchor="middle" fill="white" fillOpacity="0.45" fontSize="10" fontFamily="monospace">*.voidmarket.eth</text>
        <text x="360" y="374" textAnchor="middle" fill="white" fillOpacity="0.45" fontSize="10" fontFamily="monospace">Text Records</text>

        {/* ── Bottom Right: Circle CCTP ── */}
        <rect x="510" y="265" width="180" height="150" rx="8" stroke="white" strokeOpacity="0.25" strokeWidth="1" fill="white" fillOpacity="0.03" />
        <text x="600" y="290" textAnchor="middle" fill="white" fillOpacity="0.85" fontSize="13" fontWeight="600" letterSpacing="1.5">CIRCLE CCTP</text>
        <line x1="530" y1="300" x2="670" y2="300" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
        <text x="600" y="320" textAnchor="middle" fill="white" fillOpacity="0.45" fontSize="10" fontFamily="monospace">ETH → Arc</text>
        <text x="600" y="338" textAnchor="middle" fill="white" fillOpacity="0.45" fontSize="10" fontFamily="monospace">Base → Arc</text>
        <text x="600" y="356" textAnchor="middle" fill="white" fillOpacity="0.45" fontSize="10" fontFamily="monospace">Arb → Arc</text>
        <text x="600" y="374" textAnchor="middle" fill="white" fillOpacity="0.45" fontSize="10" fontFamily="monospace">Native USDC</text>
      </svg>
    </div>
  )
}

/* ─── Slide 8: Circle ────────────────────────────────────── */

function CircleSlide() {
  const features = [
    { title: "Developer-Controlled Wallets", desc: "Every user gets a Circle wallet keyed to their Telegram ID. Server signs all transactions. Users never see gas or handle keys." },
    { title: "CCTP Cross-Chain Deposits", desc: "Deposit USDC from Ethereum, Base, or Arbitrum. Burn on source, mint on Arc. One unified balance." },
    { title: "Arc as Settlement Layer", desc: "USDC is the native gas token on Arc. Every bet, market, and Nova settles in USDC. No wrapping, no swapping." },
    { title: "Gateway API", desc: "Unified balance queries across all chains. User sees one number regardless of deposit source." },
  ]

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
      <div className="flex flex-col items-center gap-2">
        <p className="font-[family-name:var(--font-mono)] text-[10px] text-white/50 uppercase tracking-widest">
          Sponsor Integration
        </p>
        <h2 className="font-[family-name:var(--font-accent)] text-3xl sm:text-4xl font-bold tracking-widest text-glow">
          CIRCLE
        </h2>
        <p className="font-[family-name:var(--font-display)] text-sm text-white/60 uppercase tracking-wider">
          Bridge Kit + Arc
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-12 w-full">
        {/* Left: Circle logo artwork */}
        <div className="w-48 h-48 sm:w-56 sm:h-56 shrink-0 mx-auto sm:mx-0">
          <svg viewBox="0 0 300 300" className="w-full h-full" fill="none">
            {/* Outer orbit */}
            <circle cx="150" cy="150" r="140" stroke="white" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="8 6" />
            {/* Main circle ring */}
            <circle cx="150" cy="150" r="100" stroke="white" strokeOpacity="0.3" strokeWidth="3" />
            {/* Inner ring */}
            <circle cx="150" cy="150" r="80" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
            {/* Center dot */}
            <circle cx="150" cy="150" r="8" fill="white" fillOpacity="0.2" />
            <circle cx="150" cy="150" r="3" fill="white" fillOpacity="0.5" />
            {/* CCTP flow lines */}
            <path d="M30 100 Q80 80 110 105" stroke="white" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3 3" />
            <path d="M30 200 Q80 220 110 195" stroke="white" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3 3" />
            <path d="M30 150 Q60 150 100 150" stroke="white" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3 3" />
            {/* Source chain labels */}
            <text x="20" y="98" fill="white" fillOpacity="0.35" fontSize="9" fontFamily="monospace">ETH</text>
            <text x="20" y="152" fill="white" fillOpacity="0.35" fontSize="9" fontFamily="monospace">BASE</text>
            <text x="20" y="205" fill="white" fillOpacity="0.35" fontSize="9" fontFamily="monospace">ARB</text>
            {/* USDC label */}
            <text x="150" y="155" textAnchor="middle" fill="white" fillOpacity="0.4" fontSize="11" fontWeight="600" letterSpacing="2">USDC</text>
          </svg>
        </div>

        {/* Right: Feature list */}
        <div className="flex flex-col gap-5 flex-1">
          {features.map((f, i) => (
            <div key={f.title} className="flex gap-3">
              <span className="font-[family-name:var(--font-accent)] text-lg font-black text-white/15 shrink-0 leading-none mt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-wider mb-1 text-white/90">
                  {f.title}
                </h3>
                <p className="font-[family-name:var(--font-body)] text-xs text-white/70 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Slide 9: ENS ───────────────────────────────────────── */

function ENSSlide() {
  const features = [
    { title: "Zero-Gas Subdomains", desc: "Every Star, Market, and Cluster gets *.voidmarket.eth. Stored in PostgreSQL, resolved via gateway, verified on-chain." },
    { title: "Wildcard Resolution (ENSIP-10)", desc: "Single resolver handles all subdomains. Nested subdomains for forked markets: eth-5k.darth.voidmarket.eth." },
    { title: "Text Records for DeFi", desc: "Star type, photons, cluster membership, market question, pool size, status via standard ENS queries." },
    { title: "Portable Betting Reputation", desc: "Win/loss record, photon score, and cluster membership travel with your ENS name to any ENS-aware app." },
  ]

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
      <div className="flex flex-col items-center gap-2">
        <p className="font-[family-name:var(--font-mono)] text-[10px] text-white/50 uppercase tracking-widest">
          Sponsor Integration
        </p>
        <h2 className="font-[family-name:var(--font-accent)] text-3xl sm:text-4xl font-bold tracking-widest text-glow">
          ENS
        </h2>
        <p className="font-[family-name:var(--font-display)] text-sm text-white/60 uppercase tracking-wider">
          Identity Layer
        </p>
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-center gap-8 sm:gap-12 w-full">
        {/* Left: Feature list */}
        <div className="flex flex-col gap-5 flex-1">
          {features.map((f, i) => (
            <div key={f.title} className="flex gap-3">
              <span className="font-[family-name:var(--font-accent)] text-lg font-black text-white/15 shrink-0 leading-none mt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-wider mb-1 text-white/90">
                  {f.title}
                </h3>
                <p className="font-[family-name:var(--font-body)] text-xs text-white/70 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Right: ENS domain tree visual */}
        <div className="w-56 h-56 sm:w-64 sm:h-64 shrink-0 mx-auto sm:mx-0">
          <svg viewBox="0 0 320 320" className="w-full h-full" fill="none">
            {/* Root domain */}
            <rect x="80" y="20" width="160" height="36" rx="6" stroke="white" strokeOpacity="0.35" strokeWidth="1.5" fill="white" fillOpacity="0.04" />
            <text x="160" y="43" textAnchor="middle" fill="white" fillOpacity="0.8" fontSize="12" fontWeight="600" fontFamily="monospace">voidmarket.eth</text>

            {/* Lines down to subdomains */}
            <line x1="160" y1="56" x2="160" y2="80" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
            <line x1="160" y1="80" x2="80" y2="100" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
            <line x1="160" y1="80" x2="240" y2="100" stroke="white" strokeOpacity="0.15" strokeWidth="1" />

            {/* Star subdomain */}
            <rect x="20" y="100" width="120" height="30" rx="5" stroke="white" strokeOpacity="0.25" strokeWidth="1" fill="white" fillOpacity="0.03" />
            <text x="80" y="120" textAnchor="middle" fill="white" fillOpacity="0.6" fontSize="10" fontFamily="monospace">darth.void...</text>

            {/* Market subdomain */}
            <rect x="180" y="100" width="120" height="30" rx="5" stroke="white" strokeOpacity="0.25" strokeWidth="1" fill="white" fillOpacity="0.03" />
            <text x="240" y="120" textAnchor="middle" fill="white" fillOpacity="0.6" fontSize="10" fontFamily="monospace">eth-5k.void...</text>

            {/* Lines to nested */}
            <line x1="80" y1="130" x2="80" y2="165" stroke="white" strokeOpacity="0.12" strokeWidth="1" />
            <line x1="240" y1="130" x2="240" y2="165" stroke="white" strokeOpacity="0.12" strokeWidth="1" />

            {/* Nested forked market */}
            <rect x="5" y="165" width="150" height="30" rx="5" stroke="white" strokeOpacity="0.2" strokeWidth="1" fill="white" fillOpacity="0.02" />
            <text x="80" y="185" textAnchor="middle" fill="white" fillOpacity="0.5" fontSize="9" fontFamily="monospace">eth-5k.darth.void...</text>

            {/* Text records display */}
            <rect x="165" y="165" width="150" height="30" rx="5" stroke="white" strokeOpacity="0.2" strokeWidth="1" fill="white" fillOpacity="0.02" />
            <text x="240" y="185" textAnchor="middle" fill="white" fillOpacity="0.5" fontSize="9" fontFamily="monospace">pool: 5000 USDC</text>

            {/* Bottom: CCIP-Read label */}
            <rect x="60" y="230" width="200" height="36" rx="6" stroke="white" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="4 3" fill="white" fillOpacity="0.02" />
            <text x="160" y="248" textAnchor="middle" fill="white" fillOpacity="0.4" fontSize="10" fontFamily="monospace" letterSpacing="1">CCIP-Read Gateway</text>
            <text x="160" y="260" textAnchor="middle" fill="white" fillOpacity="0.3" fontSize="8">Off-chain storage, on-chain verification</text>

            {/* Arrow from gateway up */}
            <line x1="160" y1="230" x2="160" y2="210" stroke="white" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="3 3" />
          </svg>
        </div>
      </div>

      {/* Callout */}
      <div className="rounded-lg p-3 bg-void-surface border border-white/20 w-full text-center">
        <p className="font-[family-name:var(--font-display)] text-xs text-white/70 uppercase tracking-wider">
          ENS is not an afterthought — it IS the identity layer
        </p>
      </div>
    </div>
  )
}

/* ─── Slide 10: Smart Contracts ──────────────────────────── */

function SmartContractsSlide() {
  const contracts = [
    { name: "VoidMarketCore", purpose: "Markets, commit-reveal betting, forked markets (auto-resolve), payouts" },
    { name: "ClusterManager", purpose: "Teams, invites (7-day codes), photon/energy on-chain scoring" },
    { name: "NovaManager", purpose: "Cluster battles, 3 matches/round, linked prediction markets per match" },
    { name: "VoidMarketResolver", purpose: "ENS CCIP-Read resolver (deployed on Sepolia + Arc)" },
  ]

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
      <h2 className="font-[family-name:var(--font-accent)] text-3xl sm:text-4xl font-bold tracking-widest text-glow">
        SMART CONTRACTS
      </h2>
      <p className="font-[family-name:var(--font-display)] text-sm text-white/60 uppercase tracking-wider">
        Arc Testnet + Sepolia
      </p>

      {/* Terminal window frame */}
      <div className="w-full rounded-lg overflow-hidden border border-white/25">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-void-surface border-b border-white/15">
          <div className="w-3 h-3 rounded-full bg-white/15 border border-white/20" />
          <div className="w-3 h-3 rounded-full bg-white/15 border border-white/20" />
          <div className="w-3 h-3 rounded-full bg-white/15 border border-white/20" />
          <span className="ml-3 font-[family-name:var(--font-mono)] text-[11px] text-white/40">
            contracts/
          </span>
        </div>
        {/* Terminal content */}
        <div className="p-5 bg-void-deep">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/15">
                <th className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-white/50 pb-3 pr-4">
                  Contract
                </th>
                <th className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-white/50 pb-3">
                  Purpose
                </th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.name} className="border-b border-white/8">
                  <td className="font-[family-name:var(--font-mono)] text-sm py-3 pr-4 text-white/90 whitespace-nowrap">
                    {c.name}
                  </td>
                  <td className="font-[family-name:var(--font-body)] text-sm text-white/70 py-3">{c.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-center gap-8 sm:gap-12 w-full mt-2">
        <div className="text-center">
          <p className="font-[family-name:var(--font-accent)] text-2xl sm:text-3xl font-bold text-glow-soft">~2,500</p>
          <p className="font-[family-name:var(--font-display)] text-[10px] text-white/50 uppercase tracking-wider mt-1">
            Lines of Solidity
          </p>
        </div>
        <div className="w-px h-10 bg-white/15" />
        <div className="text-center">
          <p className="font-[family-name:var(--font-accent)] text-2xl sm:text-3xl font-bold text-glow-soft">~150</p>
          <p className="font-[family-name:var(--font-display)] text-[10px] text-white/50 uppercase tracking-wider mt-1">
            Unit Tests
          </p>
        </div>
        <div className="w-px h-10 bg-white/15" />
        <div className="text-center">
          <p className="font-[family-name:var(--font-accent)] text-2xl sm:text-3xl font-bold text-glow-soft">4</p>
          <p className="font-[family-name:var(--font-display)] text-[10px] text-white/50 uppercase tracking-wider mt-1">
            Contracts
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─── Slide 11: Team ─────────────────────────────────────── */

function TeamSlide() {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl text-center">
      <h2 className="font-[family-name:var(--font-accent)] text-3xl sm:text-4xl font-bold tracking-widest text-glow">
        TEAM
      </h2>

      {/* Decorative star burst SVG */}
      <div className="relative w-36 h-36 sm:w-44 sm:h-44">
        <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
          {/* Outer rays */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
            <line
              key={angle}
              x1="100"
              y1="100"
              x2={100 + 90 * Math.cos((angle * Math.PI) / 180)}
              y2={100 + 90 * Math.sin((angle * Math.PI) / 180)}
              stroke="white"
              strokeOpacity={angle % 60 === 0 ? "0.15" : "0.06"}
              strokeWidth={angle % 60 === 0 ? "1" : "0.5"}
            />
          ))}
          {/* Outer circle */}
          <circle cx="100" cy="100" r="70" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
          {/* Middle circle */}
          <circle cx="100" cy="100" r="45" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
          {/* Inner filled circle */}
          <circle cx="100" cy="100" r="25" fill="white" fillOpacity="0.05" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" />
          {/* Center star */}
          <path
            d="M100 80l4.5 12.5H118l-11 8 4.5 12.5L100 105l-11.5 8 4.5-12.5-11-8h13.5z"
            fill="white" fillOpacity="0.2" stroke="white" strokeOpacity="0.4" strokeWidth="1"
          />
        </svg>
      </div>

      {/* Builder info */}
      <div className="flex flex-col items-center gap-3">
        <h3 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-semibold tracking-wider uppercase">
          Darth Stormer
        </h3>
        <p className="font-[family-name:var(--font-body)] text-sm text-white/60">
          Solo builder — full stack, contracts, infra, design
        </p>
        <div className="flex items-center gap-2 mt-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.6 9.6 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"
              fill="white" fillOpacity="0.5"
            />
          </svg>
          <span className="font-[family-name:var(--font-mono)] text-sm text-white/60">
            gabrielantonyxaviour
          </span>
        </div>
      </div>

      {/* Build stats */}
      <div className="flex items-center justify-center gap-6 sm:gap-10 mt-4">
        {[
          { value: "~2,500", label: "Lines Solidity" },
          { value: "83+", label: "Gateway Tests" },
          { value: "19+", label: "API Routes" },
          { value: "11", label: "Pages" },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-[family-name:var(--font-accent)] text-lg sm:text-xl font-bold text-glow-soft">{s.value}</p>
            <p className="font-[family-name:var(--font-display)] text-[9px] text-white/50 uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <p className="font-[family-name:var(--font-body)] text-xs text-white/50 mt-2">
        Everything from scratch in one hackathon
      </p>
    </div>
  )
}

/* ─── Slide 12: Thank You ────────────────────────────────── */

function ThankYouSlide() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 text-center">
      <VoidLogo size="xl" />
      <h2 className="font-[family-name:var(--font-accent)] text-4xl sm:text-6xl font-bold tracking-widest text-glow">
        THANK YOU
      </h2>
      <p className="font-[family-name:var(--font-display)] text-lg text-white/80 tracking-wider uppercase">
        VOIDMARKET
      </p>

      {/* Links */}
      <div className="flex items-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.6 9.6 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"
              fill="white" fillOpacity="0.5"
            />
          </svg>
          <span className="font-[family-name:var(--font-mono)] text-sm text-white/60">GitHub</span>
        </div>
        <div className="w-px h-4 bg-white/20" />
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" />
            <path d="M12 8v4l3 3" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="font-[family-name:var(--font-mono)] text-sm text-white/60">Demo</span>
        </div>
        <div className="w-px h-4 bg-white/20" />
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" />
            <path d="M8 12h8M12 8v8" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="font-[family-name:var(--font-mono)] text-sm text-white/60">voidmarket.eth</span>
        </div>
      </div>

      <p className="font-[family-name:var(--font-body)] text-sm text-white/60 mt-6 tracking-wide">
        Your bet goes into the void.
      </p>
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
  TeamSlide,
  ThankYouSlide,
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
