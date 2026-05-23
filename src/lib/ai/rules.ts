import type { RiskLevel } from "./types";

// ─── Risk level rules ─────────────────────────────────────────────────────────
// Evaluated in order — first match wins.

export const RISK_RULES: Array<{ keywords: string[]; risk: RiskLevel }> = [
  {
    keywords: [
      "cve",
      "exploit",
      "exploited",
      "actively exploited",
      "ransomware",
      "zero day",
      "0day",
      "rce",
      "remote code execution",
      "critical vulnerability",
      "critical flaw",
      "wormable",
      "unauthenticated",
    ],
    risk: "high",
  },
  {
    keywords: [
      "prompt injection",
      "jailbreak",
      "agent attack",
      "ai security",
      "adversarial",
      "model exfiltration",
      "supply chain",
      "privilege escalation",
      "credential",
      "lateral movement",
      "phishing",
      "malware",
      "apt",
      "threat actor",
    ],
    risk: "medium",
  },
  {
    keywords: [
      "red team",
      "bug bounty",
      "pentest",
      "security research",
      "disclosure",
      "proof of concept",
      "detection",
      "hunting",
    ],
    risk: "low",
  },
];

// ─── Why It Matters templates ─────────────────────────────────────────────────
// Picked deterministically by title hash — no randomness between renders.

export const WHY_IT_MATTERS: Record<string, string[]> = {
  CVEs: [
    "Unpatched systems are directly exposed. Cross-reference your asset inventory and apply vendor patches or deploy runtime mitigations immediately.",
    "If this component is anywhere in your stack, treat this as P0. Active exploitation may already be underway.",
    "Validate your patch posture across all environments. Even partially-mitigated instances may remain exploitable via chaining.",
  ],
  "AI Security": [
    "Organizations running LLM-based agents or chatbots face this attack surface directly. Review prompt sanitization and output validation pipelines.",
    "If you're building on foundation models, adversarial inputs targeting your instruction chain may bypass current guardrails.",
    "AI red teaming should include this variant. Update your model evaluation harness and test against adversarial prompt libraries.",
  ],
  "Threat Intelligence": [
    "This TTP may already be active against targets in your sector. Update detection rules and threat hunt for related IOCs in your telemetry.",
    "Enrich your threat model with this adversary behavior. Share IOCs through your ISAC or internal threat sharing channels.",
    "Cross-reference existing telemetry for indicators. Early detection of this campaign could prevent significant impact.",
  ],
  "Red Team": [
    "New offensive technique documented. Run it through your purple team to validate whether existing detection coverage catches it.",
    "Useful for your next tabletop or purple team exercise. Confirm SIEM/EDR rule coverage before adversaries operationalize this.",
    "Document and test in a controlled lab environment before adding to your offensive toolkit.",
  ],
  "Blue Team": [
    "Detection opportunity — implement the described behavioral signatures in your EDR or SIEM stack now.",
    "This variant may bypass existing detection rules. Update your detection-as-code pipeline and validate coverage gaps.",
    "Behavioral analytic opportunity available. Review whether your current rules cover this specific attack path.",
  ],
  SOC: [
    "Alert tuning opportunity. Implement this detection to reduce false positives while improving fidelity on real threats.",
    "Playbook update recommended. Integrate this into your IR runbooks for faster, consistent analyst triage.",
    "Review your case management and escalation paths — this class of alert benefits from a dedicated workflow.",
  ],
  "Cloud Security": [
    "Audit your cloud configurations for this pattern. IaC misconfigs are often widespread across multiple environments.",
    "Review IAM policies and resource configurations. This class of misconfiguration is frequently overlooked in cloud-native stacks.",
    "Run a CSPM scan targeting this control family. Prioritize remediation in production environments first.",
  ],
  "Kubernetes Security": [
    "Review pod security policies and RBAC across your clusters. Default configs are often exploitable out-of-the-box.",
    "If you run unmanaged Kubernetes this is urgent. Managed services (EKS/AKS/GKE) may still be affected depending on configuration.",
    "Validate your admission controller policies — this class of attack may bypass existing policy-as-code controls.",
  ],
  "Deception Technology": [
    "Evaluate whether your deception layer covers this attack vector. Update honeypot configurations to detect this behavior.",
    "New bypass technique documented. Assess whether your existing deception infrastructure would still alert on this pattern.",
  ],
  Honeypots: [
    "Evaluate whether your honeypot coverage includes this threat vector. Update sensor placement and lure configurations.",
    "New threat actor behavior documented. Align your honeypot telemetry to detect this reconnaissance or exploitation pattern.",
  ],
};

export const WHY_IT_MATTERS_DEFAULT: string[] = [
  "Review your detection coverage and assess whether this technique is in scope for your threat model.",
  "Security teams should evaluate the relevance of this finding to their specific environment and asset inventory.",
  "Stay informed — understanding emerging techniques helps prioritize your defensive investment.",
];

// ─── Humor pools ──────────────────────────────────────────────────────────────

export const HUMOR: Record<RiskLevel, string[]> = {
  high: [
    "CVSS score: please update immediately.",
    "Affected versions: yours.",
    "Patch notes: 'we probably should have fixed this sooner'.",
    "Nothing says Monday like an emergency CAB meeting.",
    "The attackers read the advisory before you did.",
    "At least the PoC is well-documented.",
    "Your on-call rotation just got more interesting.",
    "Exploitability: trivial. Urgency: yesterday.",
  ],
  medium: [
    "Your AI intern trusted user input. Again.",
    "Turns out 'helpful and harmless' is harder than it looks.",
    "Guardrails: enabled. Attacker creativity: higher.",
    "The model passed alignment eval. The adversary didn't get that memo.",
    "It's not a jailbreak, it's 'creative prompt optimization'.",
    "Supply chain: great for groceries, terrible for software.",
    "Credentials: the gift that keeps on rotating.",
  ],
  low: [
    "Someone stayed up late, found this, filed the report, and got $500. Respect.",
    "Red team 1 — 0 Blue team. Please check your logs.",
    "Bug bounty accepted. Sat in the backlog for 6 months.",
    "Low severity today. 'Wait, this chains with what?' tomorrow.",
    "Disclosure handled responsibly. A rarity worth celebrating.",
  ],
};
