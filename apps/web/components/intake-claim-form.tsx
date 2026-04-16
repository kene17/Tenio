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
  const today = new Date().toISOString().slice(0, 10);
  const [claimNumber, setClaimNumber] = useState("");
  const [patientName, setPatientName] = useState("");
  const [payerId, setPayerId] = useState(payerOptions[0]?.id ?? "payer_aetna");
  const [jurisdiction, setJurisdiction] = useState<"us" | "ca">(
    payerOptions[0]?.jurisdiction ?? "us"
  );
  const [provinceOfService, setProvinceOfService] = useState("");
  const [claimType, setClaimType] = useState(
    (payerOptions[0]?.jurisdiction ?? "us") === "ca" ? "paramedical" : ""
  );
  const [serviceProviderType, setServiceProviderType] = useState<
    "physiotherapist" | "chiropractor" | "massage_therapist" | "psychotherapist" | "other" | ""
  >("");
  const [serviceCode, setServiceCode] = useState("");
  const [planNumber, setPlanNumber] = useState("");
  const [memberCertificate, setMemberCertificate] = useState("");
  const [serviceDate, setServiceDate] = useState(today);
  const [billedAmount, setBilledAmount] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const countryCode = jurisdiction === "ca" ? "CA" : "US";

  function parseCurrencyToCents(value: string) {
    const normalized = value.trim();

    if (!normalized) {
      return null;
    }

    const numeric = Number(normalized.replace(/[^0-9.-]/g, ""));
    return Number.isNaN(numeric) ? null : Math.round(numeric * 100);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/claims", {
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
          serviceProviderType: serviceProviderType || null,
          serviceCode: serviceCode.trim() || null,
          planNumber: planNumber.trim() || null,
          memberCertificate: memberCertificate.trim() || null,
          serviceDate: serviceDate || null,
          billedAmountCents: parseCurrencyToCents(billedAmount),
          priority
        })
      });

      if (!response.ok) {
        throw new Error("Failed to create claim");
      }

      setClaimNumber("");
      setPatientName("");
      setProvinceOfService("");
      setClaimType(jurisdiction === "ca" ? "paramedical" : "");
      setServiceProviderType("");
      setServiceCode("");
      setPlanNumber("");
      setMemberCertificate("");
      setServiceDate(today);
      setBilledAmount("");
      setPriority("normal");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
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
            setClaimType((current) =>
              selectedPayer.jurisdiction === "ca" && current.length === 0 ? "paramedical" : current
            );
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
        value={serviceProviderType}
        onChange={(event) =>
          setServiceProviderType(
            event.target.value as
              | "physiotherapist"
              | "chiropractor"
              | "massage_therapist"
              | "psychotherapist"
              | "other"
              | ""
          )
        }
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="">Service discipline</option>
        <option value="physiotherapist">Physiotherapist</option>
        <option value="chiropractor">Chiropractor</option>
        <option value="massage_therapist">Massage therapist</option>
        <option value="psychotherapist">Psychotherapist</option>
        <option value="other">Other</option>
      </select>
      <input
        value={serviceCode}
        onChange={(event) => setServiceCode(event.target.value)}
        placeholder="Service code"
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
      <input
        type="date"
        value={serviceDate}
        onChange={(event) => setServiceDate(event.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
      <input
        value={planNumber}
        onChange={(event) => setPlanNumber(event.target.value)}
        placeholder="Plan number"
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
      <input
        value={memberCertificate}
        onChange={(event) => setMemberCertificate(event.target.value)}
        placeholder="Member certificate"
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
      <input
        value={billedAmount}
        onChange={(event) => setBilledAmount(event.target.value)}
        placeholder="Billed amount"
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
