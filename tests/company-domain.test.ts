import { describe, expect, it } from "vitest";

import {
  employerDomain,
  guessDomainFromCompany,
  pickCompanySite,
  registrableDomain,
} from "@/lib/company-domain";
import { getScoreTone } from "@/lib/match-score";

describe("registrableDomain", () => {
  it("strips subdomains", () => {
    expect(registrableDomain("careers.stripe.com")).toBe("stripe.com");
  });

  it("keeps a third label under known two-part suffixes", () => {
    expect(registrableDomain("jobs.acme.co.uk")).toBe("acme.co.uk");
    expect(registrableDomain("co.uk")).toBeNull();
  });

  it("rejects hostnames that are not domains", () => {
    expect(registrableDomain("localhost")).toBeNull();
    expect(registrableDomain("a..b")).toBeNull();
  });
});

describe("employerDomain", () => {
  it("returns the employer's own domain", () => {
    expect(employerDomain("https://jobs.stripe.com/listing/123")).toBe("stripe.com");
  });

  it("refuses job boards and applicant tracking systems", () => {
    expect(employerDomain("https://boards.greenhouse.io/acme/jobs/1")).toBeNull();
    expect(employerDomain("https://www.linkedin.com/jobs/view/1")).toBeNull();
  });

  it("refuses IP addresses, non-http URLs and garbage", () => {
    expect(employerDomain("http://192.168.0.1/jobs")).toBeNull();
    expect(employerDomain("ftp://acme.com")).toBeNull();
    expect(employerDomain("not a url")).toBeNull();
  });
});

describe("guessDomainFromCompany", () => {
  it("drops everything from the legal suffix on", () => {
    expect(guessDomainFromCompany("Acme Corp, Inc.")).toBe("acme.com");
  });

  it("returns null when nothing usable is left", () => {
    expect(guessDomainFromCompany("Inc.")).toBeNull();
    expect(guessDomainFromCompany("")).toBeNull();
  });
});

describe("pickCompanySite", () => {
  it("prefers a domain spelling the whole company name", () => {
    expect(
      pickCompanySite(["https://www.crunchbase.com/x", "https://worldview.space/"], "World View"),
    ).toBe("worldview.space");
  });

  it("falls back to a domain spelling the leading words", () => {
    expect(pickCompanySite(["https://www.caci.com/careers"], "CACI International")).toBe("caci.com");
  });

  it("matches whole words only", () => {
    expect(pickCompanySite(["https://meta.com"], "Metal Works")).toBeNull();
  });

  it("skips job boards", () => {
    expect(pickCompanySite(["https://www.indeed.com/cmp/acme"], "Acme")).toBeNull();
  });
});

describe("getScoreTone", () => {
  it("bands scores at 90 and 80", () => {
    expect(getScoreTone(95)).toBe("high");
    expect(getScoreTone(90)).toBe("high");
    expect(getScoreTone(85)).toBe("good");
    expect(getScoreTone(80)).toBe("good");
    expect(getScoreTone(79)).toBe("fair");
  });
});
