# Build the Formal Founder Agreement — Attorney-Ready
# Uses agreed terms from Christian's June 15 email + Chris's acceptance

$palomaBytes = [System.IO.File]::ReadAllBytes("c:\Users\Chris\Desktop\WEBSITES\Brenes Precision Dentistry\images\paloma\paloma-icon.png")
$palomaB64 = [Convert]::ToBase64String($palomaBytes)
# Think! D&P logo
$tdpBytes = [System.IO.File]::ReadAllBytes("c:\Users\Chris\Desktop\WEBSITES\Think! Design and Planning Firm\assets\think-logo-emerald.png")
$tdpB64 = [Convert]::ToBase64String($tdpBytes)

$html = @"
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>PALOMA Health Technologies LLC &#8212; Founder Agreement</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { --teal: #1A5E63; --gold: #D4A853; --dark: #1a1a1a; --gray: #64748B; --light: #f7f9fa; --green: #2D8F5C; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: letter; margin: 0.75in 0.85in; }
  body { font-family: 'Inter', 'Calibri', sans-serif; font-size: 10.5pt; color: var(--dark); line-height: 1.6; background: #eee; }
  .doc { max-width: 8.5in; margin: 20px auto; background: white; box-shadow: 0 2px 20px rgba(0,0,0,0.12); }
  .page { padding: 0.75in 0.85in; page-break-after: always; min-height: 10in; position: relative; }
  .page:last-child { page-break-after: auto; }

  .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; min-height: 10in; }
  .cover-logo { width: 120px; height: 120px; border-radius: 50%; background: #1A5E63; padding: 18px; object-fit: contain; margin-bottom: 12px; box-shadow: 0 4px 16px rgba(26,94,99,0.3); }
  .cover-title { font-size: 24pt; color: var(--teal); font-weight: 700; margin: 10px 0 4px; letter-spacing: -0.3px; }
  .cover-subtitle { font-size: 13pt; color: var(--gold); font-weight: 600; margin: 4px 0 6px; }
  .cover-tagline { font-size: 10pt; color: var(--gray); font-style: italic; margin-bottom: 24px; }
  .cover-line { width: 100px; height: 3px; background: var(--gold); margin: 12px auto; }
  .cover-meta { font-size: 9.5pt; color: #555; line-height: 2.2; margin-top: 30px; }
  .cover-meta strong { color: var(--teal); }
  .cover-footer { margin-top: 60px; }
  .cover-footer img { width: 60px; opacity: 0.6; }
  .cover-footer-text { font-size: 8pt; color: #bbb; margin-top: 4px; }

  h1 { font-size: 15pt; color: var(--teal); font-weight: 700; border-bottom: 2px solid var(--gold); padding-bottom: 5px; margin: 24px 0 10px; page-break-after: avoid; }
  h1:first-child { margin-top: 0; }
  h2 { font-size: 11pt; color: var(--teal); font-weight: 600; margin: 16px 0 6px; page-break-after: avoid; }
  p { margin-bottom: 8px; text-align: justify; }
  strong { font-weight: 600; }

  .section-num { font-size: 9pt; color: var(--gold); font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }

  table { border-collapse: collapse; width: 100%; margin: 8px 0 14px; font-size: 9.5pt; }
  th { background: var(--teal); color: white; padding: 6px 10px; text-align: left; font-weight: 600; font-size: 9pt; }
  td { padding: 5px 10px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: var(--light); }

  .callout { border-left: 4px solid var(--teal); background: #f0f6f7; padding: 10px 14px; margin: 10px 0; font-size: 9.5pt; border-radius: 0 4px 4px 0; }
  .callout-gold { border-left-color: var(--gold); background: #fdf8ed; }
  .callout strong { color: var(--teal); }

  .legal { font-size: 9.5pt; line-height: 1.65; }
  .legal p { margin-bottom: 6px; }
  .indent { padding-left: 24px; }
  .sub-indent { padding-left: 48px; }

  .sig-block { margin-top: 40px; display: flex; justify-content: space-between; gap: 40px; }
  .sig-col { flex: 1; }
  .sig-line { border-bottom: 1px solid #333; width: 100%; height: 40px; margin-bottom: 4px; }
  .sig-label { font-size: 9pt; color: var(--gray); }
  .sig-name { font-size: 10pt; font-weight: 600; margin-top: 4px; }

  .doc-footer { border-top: 2px solid var(--gold); margin-top: 30px; padding-top: 12px; text-align: center; font-size: 8pt; color: #aaa; }
  .doc-footer strong { color: var(--teal); }

  ol.terms { counter-reset: section; list-style: none; padding: 0; }
  ol.terms > li { counter-increment: section; margin-bottom: 6px; }
  ol.terms > li::before { content: counter(section, lower-alpha) ") "; font-weight: 600; color: var(--teal); }
  ol.roman { counter-reset: roman; list-style: none; padding-left: 24px; }
  ol.roman > li { counter-increment: roman; margin-bottom: 4px; }
  ol.roman > li::before { content: "(" counter(roman, lower-roman) ") "; color: var(--gray); }

  .download-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; background: linear-gradient(135deg, var(--teal), #0f766e); padding: 16px; text-align: center; box-shadow: 0 -4px 20px rgba(0,0,0,0.2); }
  .download-bar button { padding: 12px 40px; background: white; color: var(--teal); border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; }
  .download-bar button:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
  .download-bar span { color: white; font-size: 13px; margin-left: 16px; opacity: 0.9; }

  @media print {
    body { background: white; }
    .doc { box-shadow: none; margin: 0; max-width: none; }
    .page { padding: 0; min-height: auto; }
    .download-bar { display: none !important; }
  }
</style>
</head>
<body>
<div class="doc">

<!-- ═══ COVER ═══ -->
<div class="page cover">
  <img class="cover-logo" src="data:image/png;base64,$palomaB64" alt="PALOMA">
  <div class="cover-title">Founder Agreement</div>
  <div class="cover-subtitle">Paloma Health Technologies LLC</div>
  <div class="cover-tagline">Operating Agreement &#38; Co-Founder Terms</div>
  <div class="cover-line"></div>
  <div class="cover-meta">
    <strong>Party A:</strong> Dr. Christian Brenes, DMD &#8212; Clinical Founder (55%)<br>
    <strong>Party B:</strong> W. Chris Harrison &#8212; Technical Co-Founder (45%)<br><br>
    <strong>Effective Date:</strong> _________________, 2026<br>
    <strong>State of Formation:</strong> North Carolina<br>
    <strong>Principal Office:</strong> Greensboro, NC
  </div>
  <div class="cover-footer">
    <img src="data:image/png;base64,$tdpB64" alt="Think! Design and Planning" style="width:80px; opacity:0.7;">
    <div class="cover-footer-text">Prepared by Think! Design &#38; Planning, LLC</div>
  </div>
</div>

<!-- ═══ RECITALS ═══ -->
<div class="page legal">
  <h1>Recitals</h1>
  <p><strong>WHEREAS,</strong> Dr. Christian Brenes, DMD (&#8220;Brenes&#8221;) is a licensed prosthodontist and owner of Lake Jeanette Family &#38; Implant Dentistry, bringing clinical expertise, industry credibility, practice-level beta testing, and dental community distribution to the venture;</p>
  <p><strong>WHEREAS,</strong> W. Chris Harrison (&#8220;Harrison&#8221;), individually and through Think! Design &#38; Planning, LLC, has designed, developed, and deployed the PALOMA software platform including all AI systems, patient portal, administrative dashboard, and associated technology;</p>
  <p><strong>WHEREAS,</strong> both parties desire to form Paloma Health Technologies LLC (the &#8220;Company&#8221;) to commercialize, market, and sell the PALOMA platform as a subscription software service to dental practices;</p>
  <p><strong>NOW, THEREFORE,</strong> the parties agree as follows:</p>

  <!-- ARTICLE 1 -->
  <h1>Article 1: Formation &#38; Purpose</h1>
  <p><strong>1.1 Name.</strong> The Company shall be known as <strong>Paloma Health Technologies LLC</strong> (the &#8220;Company&#8221;).</p>
  <p><strong>1.2 Formation.</strong> The Company shall be formed as a North Carolina limited liability company within thirty (30) days of the Effective Date of this Agreement.</p>
  <p><strong>1.3 Purpose.</strong> The Company&#8217;s purpose is to develop, market, sell, and support AI-powered dental practice management software and related digital services under the PALOMA brand, including but not limited to: AI patient communication, practice analytics, appointment management, patient portal, automated communications, integrated 3D dental visualization, and <strong>website design and development services for dental practice clients</strong>.</p>
  <p><strong>1.4 Principal Office.</strong> Greensboro, North Carolina, or such other location as the Members may agree.</p>
  <p><strong>1.5 Registered Agent.</strong> To be designated upon formation.</p>

  <!-- ARTICLE 2 -->
  <h1>Article 2: Membership &#38; Equity</h1>
  <p><strong>2.1 Members.</strong></p>
  <table>
    <tr><th>Member</th><th>Role</th><th>Membership Interest</th></tr>
    <tr><td>Dr. Christian Brenes, DMD (individually)</td><td>Clinical Founder &#38; Chief Clinical Officer</td><td><strong>55%</strong></td></tr>
    <tr><td>W. Chris Harrison (individually)</td><td>Technical Co-Founder &#38; Chief Technology Officer</td><td><strong>45%</strong></td></tr>
  </table>

  <p><strong>2.2 Capital Contributions.</strong></p>
  <table>
    <tr><th>Member</th><th>Contribution</th><th>Value</th></tr>
    <tr><td>Brenes</td><td>Clinical expertise, beta testing site (Lake Jeanette), dental society network, reputational capital, ongoing clinical validation</td><td>Sweat equity</td></tr>
    <tr><td>Harrison</td><td>Complete PALOMA software platform (all code, infrastructure, AI systems, design), perpetual MouthMap dental license (see Article 6), ongoing technical development</td><td>Sweat equity + IP</td></tr>
  </table>
  <p>No cash capital contributions are required from either Member at formation. Both Members acknowledge that their respective contributions are of approximately equal value and that the 55/45 split reflects the additional reputational and distribution risk assumed by Brenes.</p>

  <p><strong>2.3 Vesting.</strong></p>
  <div class="indent">
    <p>(a) All Membership Interests shall vest over a four (4) year period with a two (2) year cliff.</p>
    <p>(b) No Membership Interest shall vest until the second anniversary of the Effective Date.</p>
    <p>(c) After the cliff, Membership Interests vest monthly at 1/48th per month.</p>
    <p>(d) Upon a Change of Control event (acquisition, merger, or sale of substantially all assets), all unvested Membership Interests shall immediately and fully vest (&#8220;Acceleration&#8221;).</p>
    <p>(e) A departing Member forfeits all unvested Membership Interests. Vested interests are retained subject to the buyout provisions in Article 9.</p>
  </div>
</div>

<!-- ═══ ARTICLES 3-4 ═══ -->
<div class="page legal">
  <h1>Article 3: Compensation &#38; Distributions</h1>

  <p><strong>3.1 Phase 1: Development (Formation through First Five (5) Paying Subscribers).</strong></p>
  <div class="indent">
    <p>(a) Neither Member shall receive a salary or founder draw during Phase 1.</p>
    <p>(b) Harrison&#8217;s development hours shall be tracked at Seventy-Five Dollars (&#36;75) per hour (&#8220;Deferred Development Hours&#8221;), <strong>capped at a total of Thirty Thousand Dollars (&#36;30,000) during Phase 1</strong>. No hourly logs or timesheets shall be required; the cap represents a flat, agreed-upon value for the Initial Sprint and related Phase 1 development. These hours represent deferred compensation payable exclusively from Company revenue and do not constitute a debt obligation of the Company or of Brenes personally.</p>
    <p>(c) Lake Jeanette Family &#38; Implant Dentistry shall serve as the Company&#8217;s beta testing site at no charge during Phase 1. No subscription fees shall be charged to any beta testing site during this phase.</p>
    <p>(d) Operating expenses (hosting, APIs, domain registration, development tools) shall be documented and shared equally (50/50) by the Members. <strong>Individual operating expenditures of Five Hundred Dollars (&#36;500) per month or less may be authorized by either Member independently. Expenditures exceeding &#36;500 per month require mutual written consent of both Members prior to commitment.</strong> Expenses advanced by one Member shall be documented as a Member Loan repayable from Company revenue.</p>
  </div>

  <p><strong>3.2 Phase 2: Early Revenue (Five (5) through Twenty-Five (25) Paying Subscribers).</strong></p>
  <div class="indent">
    <p>(a) Revenue shall be allocated in the following priority: (i) operating expenses, (ii) repayment of Deferred Development Hours and Member Loans, (iii) retained for growth.</p>
    <p>(b) Each Member shall receive a Founder Draw of Two Thousand Five Hundred Dollars (&#36;2,500) per month, commencing when Monthly Recurring Revenue (&#8220;MRR&#8221;) equals or exceeds Ten Thousand Dollars (&#36;10,000) for three (3) consecutive months.</p>
    <p>(c) Think! Design and Planning, LLC (Harrison&#8217;s services entity) may invoice the Company for ongoing development services at Seventy-Five Dollars (&#36;75) per hour, payable monthly from Company revenue, subject to mutual approval of scope.</p>
  </div>

  <p><strong>3.3 Phase 3: Growth (Twenty-Five (25)+ Paying Subscribers).</strong></p>
  <div class="indent">
    <p>(a) Each Member shall receive a Founder Salary of Eight Thousand Dollars (&#36;8,000) per month (&#36;96,000 annualized), commencing when MRR equals or exceeds Twenty-Five Thousand Dollars (&#36;25,000) for three (3) consecutive months.</p>
    <p>(b) Salary adjustments shall be reviewed annually and require unanimous Member consent.</p>
    <p>(c) After payment of all salaries, operating expenses, and maintenance of a three (3) month cash reserve, remaining profits shall be distributed to Members pro-rata according to their Membership Interests (55/45).</p>
  </div>

  <p><strong>3.4 Founding Practice Designation.</strong> Lake Jeanette Family &#38; Implant Dentistry shall be designated as the Company&#8217;s &#8220;Founding Practice&#8221; and shall receive <strong>perpetual, free access</strong> to the PALOMA platform at the highest available service tier, for the lifetime of the Company. This designation is granted in recognition of Brenes&#8217;s role as Clinical Founder and Lake Jeanette&#8217;s contribution as the original beta testing site. The Founding Practice designation is non-transferable and applies solely to Lake Jeanette Family &#38; Implant Dentistry. Revenue metrics (MRR thresholds, subscriber counts) used to trigger compensation milestones in this Agreement shall exclude the Founding Practice and count only external paying subscribers.</p>

  <h1>Article 4: Roles &#38; Responsibilities</h1>
  <p><strong>4.1 Brenes (Clinical Founder &#38; CCO).</strong></p>
  <div class="indent">
    <p>(a) Clinical direction and validation of all AI-generated dental recommendations.</p>
    <p>(b) Beta testing through Lake Jeanette Family &#38; Implant Dentistry.</p>
    <p>(c) Business development and distribution through dental professional networks.</p>
    <p>(d) Sales to dental practices upon commercial release.</p>
    <p>(e) Clinical compliance review and dental regulatory guidance.</p>
  </div>

  <p><strong>4.2 Harrison (Technical Co-Founder &#38; CTO).</strong></p>
  <div class="indent">
    <p>(a) All software development, architecture, and technical infrastructure.</p>
    <p>(b) AI system design, training, and maintenance.</p>
    <p>(c) Security, HIPAA compliance architecture, and data protection.</p>
    <p>(d) Product design, user experience, and ongoing feature development.</p>
    <p>(e) Technical operations, deployment, and system maintenance.</p>
  </div>
</div>

<!-- ═══ ARTICLES 5-6 ═══ -->
<div class="page legal">
  <h1>Article 5: Governance &#38; Decision-Making</h1>

  <p><strong>5.1 Member-Managed.</strong> The Company shall be member-managed. Day-to-day decisions within each Member&#8217;s domain (clinical or technical) may be made independently.</p>

  <p><strong>5.2 Unanimous Consent Required.</strong> The following actions require unanimous written consent of both Members:</p>
  <div class="indent">
    <p>(a) Changes to the Company&#8217;s business purpose or target market;</p>
    <p>(b) Issuance of Membership Interests exceeding five percent (5%) to any third party;</p>
    <p>(c) Accepting external funding, investment, or debt exceeding Ten Thousand Dollars (&#36;10,000);</p>
    <p>(d) Hiring employees with total compensation exceeding Fifty Thousand Dollars (&#36;50,000) per year;</p>
    <p>(e) Dissolution, merger, sale of substantially all assets, or any Change of Control transaction;</p>
    <p>(f) Changes to Member compensation or distribution formulas;</p>
    <p>(g) Amendments to this Agreement;</p>
    <p>(h) Execution of contracts exceeding Twenty-Five Thousand Dollars (&#36;25,000) in value;</p>
    <p>(i) Any related-party transactions.</p>
  </div>

  <p><strong>5.3 Deadlock Resolution.</strong> In the event of a deadlock on any matter requiring unanimous consent:</p>
  <div class="indent">
    <p>(a) The Members shall negotiate in good faith for thirty (30) days;</p>
    <p>(b) If unresolved, the dispute shall be submitted to non-binding mediation;</p>
    <p>(c) If mediation fails, the dispute shall be resolved by binding arbitration under the rules of the American Arbitration Association, conducted in Greensboro, North Carolina.</p>
  </div>

  <h1>Article 6: Intellectual Property</h1>

  <p><strong>6.1 Company IP.</strong> The following intellectual property shall be owned by the Company:</p>
  <div class="indent">
    <p>(a) The PALOMA brand, name, logo, and all associated trademarks;</p>
    <p>(b) All PALOMA platform source code, including AI systems, patient portal, administrative dashboard, communication tools, and practice management features;</p>
    <p>(c) All clinical algorithms, data models, and business logic developed for the Company;</p>
    <p>(d) All customer data, analytics, and business records;</p>
    <p>(e) All marketing materials, content, and sales collateral.</p>
  </div>

  <p><strong>6.2 MouthMap License.</strong> Think! Design and Planning, LLC (&#8220;Think! D&#38;P&#8221;), a separate entity owned by Harrison, owns the MouthMap 3D visualization engine. Think! D&#38;P hereby grants to the Company:</p>
  <div class="indent">
    <p>(a) A <strong>perpetual, irrevocable, royalty-free, exclusive license</strong> to use the MouthMap dental visualization module within the PALOMA platform for dental practice management purposes;</p>
    <p>(b) This license shall survive any departure of Harrison from the Company, any transfer of Membership Interests, and any dissolution of Think! D&#38;P;</p>
    <p>(c) <strong>&#8220;Exclusive&#8221; means no other dental practice management software, dental school, dental educational institution, or hospital dental department may license the MouthMap dental module.</strong> The Company&#8217;s exclusive dental territory includes, without limitation: private dental practices, group practices, dental service organizations (DSOs), dental schools and university dental programs, hospital dental departments, and dental residency programs;</p>
    <p>(d) The license includes all updates, improvements, and enhancements to the dental module made by Think! D&#38;P;</p>
    <p>(e) Think! D&#38;P retains ownership of the MouthMap platform and may license non-dental modules (orthopedic, dermatologic, cardiac, etc.) to third parties without restriction, provided such licenses do not compete with the Company&#8217;s dental business as defined in Section 6.2(c). Think! D&#38;P may license MouthMap for non-practice-management educational purposes (e.g., standalone anatomy visualization for general medical education) provided such use does not include practice management, patient records, or clinical workflow features;</p>
  </div>

  <p><strong>6.3 Pre-Existing IP.</strong> Each Member retains ownership of intellectual property created prior to the formation of the Company. Any pre-existing IP used by the Company is licensed to the Company on terms consistent with this Agreement.</p>

  <p><strong>6.4 Work Product Assignment.</strong> All work product created by either Member specifically for the Company during the term of this Agreement shall be assigned to and owned by the Company.</p>
</div>

<!-- ═══ ARTICLES 7-9 ═══ -->
<div class="page legal">
  <h1>Article 7: Development Sprint Commitment</h1>

  <p><strong>7.1 Initial Sprint.</strong> Harrison commits to a minimum of forty (40) hours per week of dedicated development for a period of eight (8) weeks following the Effective Date (the &#8220;Initial Sprint&#8221;).</p>
  <p><strong>7.2 Sprint Deliverables.</strong> The Initial Sprint shall produce, at minimum:</p>
  <div class="indent">
    <p>(a) Mobile-responsive patient portal with functional MouthMap integration;</p>
    <p>(b) Multi-practice architecture enabling onboarding of new dental practices;</p>
    <p>(c) Automated billing integration (Stripe or equivalent);</p>
    <p>(d) Marketing website and commercial demo capability;</p>
    <p>(e) HIPAA compliance documentation and security audit.</p>
  </div>
  <p><strong>7.3 Brenes Commitments During Sprint.</strong> During the Initial Sprint, Brenes shall:</p>
  <div class="indent">
    <p>(a) Participate in weekly check-in calls (minimum 30 minutes);</p>
    <p>(b) Provide clinical feedback on features and AI responses;</p>
    <p>(c) Supply sample patient data (de-identified) and STL scan files for testing;</p>
    <p>(d) Identify five to ten (5&#8211;10) dental colleagues for commercial demonstrations;</p>
    <p>(e) Provide updated suggestions and feature priority feedback.</p>
  </div>

  <h1>Article 8: Confidentiality &#38; Non-Compete</h1>
  <p><strong>8.1 Confidentiality.</strong> Each Member shall maintain the confidentiality of all proprietary information, trade secrets, customer data, financial information, and business strategies of the Company. This obligation survives termination of membership.</p>
  <p><strong>8.2 Non-Compete.</strong> During the term of membership and for a period of twenty-four (24) months following departure, neither Member shall directly or indirectly develop, market, or sell a competing AI-powered dental practice management platform. This restriction applies only to dental practice management software substantially similar to PALOMA and does not restrict:</p>
  <div class="indent">
    <p>(a) Brenes from practicing dentistry or operating dental practices;</p>
    <p>(b) Harrison from developing non-dental software or non-competing MouthMap modules;</p>
    <p>(c) Either Member from investing in non-competing technology companies.</p>
  </div>

  <p><strong>8.3 Business Associate Agreement (BAA).</strong> Prior to the Company processing, storing, or transmitting any Protected Health Information (&#8220;PHI&#8221;) as defined under HIPAA, including de-identified patient records or dental scan files originating from Lake Jeanette Family &#38; Implant Dentistry or any other covered entity, <strong>a Business Associate Agreement shall be executed between the Company and the applicable covered entity</strong>. No patient data shall be uploaded, transferred, or processed by the Company until the relevant BAA is fully executed. Harrison shall ensure that the Company&#8217;s technical infrastructure meets the security requirements specified in the BAA, including encryption, access controls, and audit logging.</p>

  <h1>Article 9: Transfer, Departure &#38; Buyout</h1>
  <p><strong>9.1 Restrictions on Transfer.</strong> No Member may transfer, sell, or assign Membership Interests without the prior written consent of the other Member, except to a wholly-owned entity of such Member.</p>
  <p><strong>9.2 Right of First Refusal.</strong> If a Member receives a bona fide third-party offer to purchase their Membership Interest, the other Member shall have thirty (30) days to match the offer.</p>
  <p><strong>9.3 Tag-Along Rights.</strong> If either Member sells their interest to a third party, the other Member has the right to sell their interest on the same terms and conditions.</p>
  <p><strong>9.4 Drag-Along Rights.</strong> If both Members jointly agree to a sale of the Company, both are obligated to participate in the transaction.</p>
  <p><strong>9.5 Death or Disability.</strong> Upon the death or permanent disability of a Member, the surviving Member shall have the option to purchase the deceased/disabled Member&#8217;s vested interest at fair market value, determined by an independent valuation or mutually agreed formula, payable over twenty-four (24) months.</p>
  <p><strong>9.6 Voluntary Departure.</strong> A departing Member forfeits all unvested Membership Interests. Vested interests may be purchased by the remaining Member at fair market value within ninety (90) days of departure.</p>
</div>

<!-- ═══ ARTICLES 10-11 + SIGNATURES ═══ -->
<div class="page legal">
  <h1>Article 10: Representations &#38; Warranties</h1>
  <p><strong>10.1</strong> Each Member represents and warrants that:</p>
  <div class="indent">
    <p>(a) They have full power and authority to enter into this Agreement;</p>
    <p>(b) This Agreement does not conflict with any other agreement to which they are a party;</p>
    <p>(c) They will comply with all applicable laws in the performance of their obligations;</p>
    <p>(d) All contributions described herein are free of liens, claims, and encumbrances.</p>
  </div>
  <p><strong>10.2</strong> Harrison represents that the PALOMA software platform and all contributed code is original work, free of third-party intellectual property claims, and that Think! D&#38;P has the authority to grant the MouthMap license described in Article 6.</p>
  <p><strong>10.3</strong> Brenes represents that he has the authority to designate Lake Jeanette Family &#38; Implant Dentistry as a beta testing site and future subscriber.</p>

  <h1>Article 11: General Provisions</h1>
  <p><strong>11.1 Governing Law.</strong> This Agreement shall be governed by the laws of the State of North Carolina.</p>
  <p><strong>11.2 Entire Agreement.</strong> This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, and agreements.</p>
  <p><strong>11.3 Amendments.</strong> This Agreement may be amended only by written instrument signed by both Members.</p>
  <p><strong>11.4 Severability.</strong> If any provision is found unenforceable, the remaining provisions shall remain in full force and effect.</p>
  <p><strong>11.5 Notices.</strong> All notices shall be in writing and delivered to the addresses on file with the Company.</p>
  <p><strong>11.6 Independent Legal Counsel.</strong> Each Member acknowledges the opportunity to seek independent legal counsel prior to executing this Agreement.</p>

  <h1 style="border-bottom: none; margin-top: 40px;">Signatures</h1>
  <p>IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.</p>

  <div class="sig-block">
    <div class="sig-col">
      <div class="sig-line"></div>
      <div class="sig-label">Signature</div>
      <div class="sig-name">Dr. Christian Brenes, DMD</div>
      <div class="sig-label">Clinical Founder &#38; Chief Clinical Officer</div>
      <div class="sig-label" style="margin-top:20px;">Date: _____________________</div>
    </div>
    <div class="sig-col">
      <div class="sig-line"></div>
      <div class="sig-label">Signature</div>
      <div class="sig-name">W. Chris Harrison</div>
      <div class="sig-label">Technical Co-Founder &#38; Chief Technology Officer</div>
      <div class="sig-label" style="margin-top:20px;">Date: _____________________</div>
    </div>
  </div>

  <h2 style="margin-top:40px;">Acknowledgment &#8212; Think! Design &#38; Planning, LLC</h2>
  <p>Think! Design and Planning, LLC, as the owner of the MouthMap 3D visualization engine, hereby acknowledges and confirms the license grant set forth in Article 6.2 of this Agreement, and agrees to be bound by the terms thereof.</p>

  <div style="margin-top:24px; max-width:45%;">
    <div class="sig-line"></div>
    <div class="sig-label">Signature</div>
    <div class="sig-name">W. Chris Harrison</div>
    <div class="sig-label">Owner/Member, Think! Design &#38; Planning, LLC</div>
    <div class="sig-label" style="margin-top:20px;">Date: _____________________</div>
  </div>

  <div class="doc-footer">
    <strong>Paloma Health Technologies LLC</strong> &#8212; Founder Agreement<br>
    <span style="color:#ccc;">Draft for Attorney Review &#8212; v2.0 &#8212; June 2026</span>
  </div>
</div>

</div>

<!-- ═══ SCHEDULE A ═══ -->
<div class="page legal">
  <h1>Schedule A: MouthMap Technical Architecture</h1>
  <div class="callout">
    <strong>Purpose of this Schedule:</strong> This document explains the technical rationale for licensing the MouthMap dental visualization module to the Company rather than contributing it as a separable code asset.
  </div>

  <h2>1. Shared Codebase Architecture</h2>
  <p>MouthMap is built on a <strong>unified rendering engine</strong> that powers all medical specialty modules. The core technology stack includes:</p>
  <table>
    <tr><th>Layer</th><th>Technology</th><th>Shared Across</th></tr>
    <tr><td>3D Rendering Engine</td><td>Three.js / WebGL</td><td>All specialties</td></tr>
    <tr><td>File Parser</td><td>STL / PLY / OBJ import</td><td>All specialties</td></tr>
    <tr><td>Shader Pipeline</td><td>Custom GLSL shaders for surface analysis</td><td>All specialties</td></tr>
    <tr><td>Annotation System</td><td>Interactive 3D labels, measurements, overlays</td><td>All specialties</td></tr>
    <tr><td>Color Mapping</td><td>Clinical heatmaps (decay, inflammation, bone density)</td><td>All specialties</td></tr>
    <tr><td>Camera Controls</td><td>Orbit, zoom, pan, cross-section views</td><td>All specialties</td></tr>
    <tr><td>Export Pipeline</td><td>Screenshot, PDF report, 3D print preparation</td><td>All specialties</td></tr>
  </table>

  <p>Approximately <strong>90% of the MouthMap codebase</strong> is shared infrastructure. The dental-specific code (tooth numbering, periodontal charting, implant templates) represents only ~10% of the total and is deeply integrated with the shared layers.</p>

  <h2>2. Why the Dental Module Cannot Be Separated</h2>
  <table>
    <tr><th>Issue</th><th>Consequence of Separation</th></tr>
    <tr><td>Shared rendering engine</td><td>Two divergent copies of the same 3D engine &#8212; bugs fixed in one won&#8217;t reach the other</td></tr>
    <tr><td>Shader dependencies</td><td>Dental overlays (plaque, decay) use the same shaders as orthopedic overlays (bone density) &#8212; can&#8217;t split without duplicating</td></tr>
    <tr><td>File parser coupling</td><td>STL import code is identical for dental scans and joint scans &#8212; separation creates maintenance nightmare</td></tr>
    <tr><td>Annotation system</td><td>Tooth labels and joint labels use the same 3D annotation framework</td></tr>
    <tr><td>Update propagation</td><td>Improvements to the engine (performance, new file formats, accessibility) would not flow to PALOMA&#8217;s copy</td></tr>
  </table>

  <h2>3. Why a Perpetual Irrevocable License Is Superior</h2>
  <table>
    <tr><th>Feature</th><th>Code Contribution</th><th>Perpetual Irrevocable License</th></tr>
    <tr><td>PALOMA&#8217;s access</td><td>Permanent</td><td>Permanent &#8212; identical protection</td></tr>
    <tr><td>Can it be revoked?</td><td>No</td><td>No &#8212; &#8220;irrevocable&#8221; means forever</td></tr>
    <tr><td>Cost to PALOMA</td><td>&#36;0</td><td>&#36;0 &#8212; royalty-free</td></tr>
    <tr><td>Receives updates?</td><td>No &#8212; frozen copy</td><td><strong>Yes &#8212; all improvements included</strong></td></tr>
    <tr><td>Maintenance burden</td><td>PALOMA maintains its own copy</td><td><strong>Think! D&#38;P maintains one codebase</strong></td></tr>
    <tr><td>Competitor access</td><td>Only PALOMA has it</td><td>Only PALOMA has it &#8212; exclusive license</td></tr>
    <tr><td>Survives Harrison&#8217;s departure?</td><td>Yes</td><td>Yes &#8212; explicitly stated in Article 6.2(b)</td></tr>
  </table>

  <div class="callout callout-gold">
    <strong>Summary:</strong> The perpetual irrevocable license gives PALOMA <strong>identical security to ownership</strong> with the added benefit of automatic updates and zero maintenance burden. PALOMA can never lose access to MouthMap&#8217;s dental visualization &#8212; under any circumstance, including Harrison&#8217;s departure from the Company.
  </div>

  <h2>4. The BodyMap Roadmap</h2>
  <p>The unified MouthMap engine is designed to expand into a family of medical visualization modules under the &#8220;BodyMap&#8221; brand:</p>
  <table>
    <tr><th>Module</th><th>Specialty</th><th>Uses Shared Engine?</th><th>PALOMA Exclusive?</th></tr>
    <tr><td><strong>MouthMap</strong></td><td>Dental</td><td>Yes &#8212; 90% shared</td><td><strong>Yes &#8212; exclusive to PALOMA</strong></td></tr>
    <tr><td>JointMap</td><td>Orthopedics</td><td>Yes &#8212; 90% shared</td><td>No &#8212; separate market</td></tr>
    <tr><td>SkinMap</td><td>Dermatology</td><td>Yes &#8212; 85% shared</td><td>No &#8212; separate market</td></tr>
    <tr><td>SpineMap</td><td>Neurology</td><td>Yes &#8212; 90% shared</td><td>No &#8212; separate market</td></tr>
    <tr><td>HeartMap</td><td>Cardiology</td><td>Yes &#8212; 80% shared</td><td>No &#8212; separate market</td></tr>
  </table>
  <p>Each module adds ~10% specialty-specific code on top of the shared engine. Separating the dental module would freeze PALOMA&#8217;s copy and prevent it from benefiting from the engine improvements driven by other specialty modules.</p>

  <div class="doc-footer">
    <strong>Schedule A</strong> &#8212; MouthMap Technical Architecture<br>
    <span style="color:#ccc;">Incorporated by reference into the Founder Agreement &#8212; Paloma Health Technologies LLC</span>
  </div>
</div>


<div class="download-bar">
  <button onclick="window.print()">Save as PDF</button>
  <span>Use &#8220;Save as PDF&#8221; as the printer destination</span>
</div>

</body>
</html>
"@

$outPath = "c:\Users\Chris\Desktop\WEBSITES\Brenes Precision Dentistry\PALOMA_Founder_Agreement.html"
[System.IO.File]::WriteAllText($outPath, $html, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done! Saved to: $outPath"
