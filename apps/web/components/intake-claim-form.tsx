"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type IntakeClaimFormProps = {
  organizationId: string;
  payerOptions: Array<{
    id: string;
    label: string;
    jurisdiction: "us" | "ca";
    countryCode: "US" | "CA";
  }>;
};

export function IntakeClaimForm({
  organizationId,
  payerOptions
}: IntakeClaimFormProps) {
  const router = useRouter();
  const [claimNumber, setClaimNumber] = useState("");
  const [patientName, setPatientName] = useState("");
  const [payerId, setPayerId] = useState(payerOptions[0]?.id ?? "payer_aetna");
  const [jurisdiction, setJurisdiction] = useState<"us" | "ca">(
    payerOptions[0]?.jurisdiction ?? "us"
  );
  const [provinceOfService, setProvinceOfService] = useState("");
  const [claimType, setClaimType] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const countryCode = jurisdiction === "ca" ? "CA" : "US";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/claims/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          organizationId,
          payerId,
          claimNumber,
          patientName,
          jurisdiction,
          countryCode,
          provinceOfService: provinceOfService.trim() || null,
          claimType: claimType.trim() || null,
          priority
        })
      });

      if (!response.ok) {
        throw new Error("Failed to create claim");
      }

      setClaimNumber("");
      setPatientName("");
      setProvinceOfService("");
      setClaimType("");
      setPriority("normal");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
      <input
        value={claimNumber}
        onChange={(event) => setClaimNumber(event.target.value)}
        placeholder="Claim number"
        required
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
      <input
        value={patientName}
        onChange={(event) => setPatientName(event.target.value)}
        placeholder="Patient name"
        required
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
      <select
        value={payerId}
        onChange={(event) => {
          const nextPayerId = event.target.value;
          const selectedPayer = payerOptions.find((payer) => payer.id === nextPayerId);
          setPayerId(nextPayerId);
          if (selectedPayer) {
            setJurisdiction(selectedPayer.jurisdiction);
          }
        }}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      >
        {payerOptions.map((payer) => (
          <option key={payer.id} value={payer.id}>
            {payer.label}
          </option>
        ))}
      </select>
      <select
        value={jurisdiction}
        onChange={(event) => setJurisdiction(event.target.value as "us" | "ca")}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="us">US</option>
        <option value="ca">Canada</option>
      </select>
      <select
        value={claimType}
        onChange={(event) => setClaimType(event.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="">Claim type</option>
        <option value="medical">Medical</option>
        <option value="dental">Dental</option>
        <option value="paramedical">Paramedical</option>
        <option value="vision">Vision</option>
        <option value="drug">Drug</option>
        <option value="travel">Travel</option>
      </select>
      <input
        value={provinceOfService}
        onChange={(event) => setProvinceOfService(event.target.value.toUpperCase())}
        placeholder={jurisdiction === "ca" ? "Province (e.g. ON)" : "State / Province"}
        maxLength={3}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
      <select
        value={priority}
        onChange={(event) =>
          setPriority(event.target.value as "low" | "normal" | "high" | "urgent")
        }
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      >
        {["low", "normal", "high", "urgent"].map((value) => (
          <option key={value} value={value}>
            {value[0].toUpperCase() + value.slice(1)}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {isSubmitting ? "Adding..." : "Add Claim"}
      </button>
    </form>
  );
}
