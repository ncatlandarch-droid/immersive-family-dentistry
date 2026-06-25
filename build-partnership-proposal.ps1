# Build Partnership Proposal PDF-ready HTML with embedded logos
# Uses the same proven approach as build-proposal2.ps1

# Load PALOMA logo as base64
$palomaBytes = [System.IO.File]::ReadAllBytes("c:\Users\Chris\Desktop\WEBSITES\Brenes Precision Dentistry\images\paloma\paloma-icon.png")
$palomaB64 = [Convert]::ToBase64String($palomaBytes)

# TV logos are already base64 text
$tvB64 = (Get-Content "c:\Users\Chris\Desktop\WEBSITES\Brenes Precision Dentistry\tv-logo-b64.txt" -Raw).Trim()
$tvFooterB64 = (Get-Content "c:\Users\Chris\Desktop\WEBSITES\Brenes Precision Dentistry\tv-footer-b64.txt" -Raw).Trim()

$html = @"
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>PALOMA Partnership Proposal</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { --teal: #1A5E63; --gold: #D4A853; --dark: #1a1a1a; --gray: #64748B; --light: #f7f9fa; --green: #2D8F5C; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: letter; margin: 0.75in 0.85in; }
  body { font-family: 'Inter', 'Calibri', sans-serif; font-size: 10.5pt; color: var(--dark); line-height: 1.55; background: #eee; }
  .doc { max-width: 8.5in; margin: 20px auto; background: white; box-shadow: 0 2px 20px rgba(0,0,0,0.12); }
  .page { padding: 0.75in 0.85in; page-break-after: always; min-height: 10in; position: relative; }
  .page:last-child { page-break-after: auto; }

  .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; min-height: 10in; }
  .cover-logo { width: 120px; height: 120px; border-radius: 50%; background: #1A5E63; padding: 18px; object-fit: contain; margin-bottom: 12px; box-shadow: 0 4px 16px rgba(26,94,99,0.3); }
  .cover-title { font-size: 28pt; color: var(--teal); font-weight: 700; margin: 10px 0 4px; letter-spacing: -0.5px; }
  .cover-subtitle { font-size: 14pt; color: var(--gold); font-weight: 600; margin: 4px 0 6px; }
  .cover-tagline { font-size: 10.5pt; color: var(--gray); font-style: italic; margin-bottom: 24px; }
  .cover-line { width: 100px; height: 3px; background: var(--gold); margin: 12px auto; }
  .cover-meta { font-size: 9.5pt; color: #555; line-height: 2.2; margin-top: 30px; }
  .cover-meta strong { color: var(--teal); }
  .cover-footer { margin-top: 60px; }
  .cover-footer img { width: 60px; opacity: 0.6; }
  .cover-footer-text { font-size: 8pt; color: #bbb; margin-top: 4px; }

  h1 { font-size: 16pt; color: var(--teal); font-weight: 700; border-bottom: 3px solid var(--gold); padding-bottom: 5px; margin: 28px 0 12px; page-break-after: avoid; }
  h1:first-child { margin-top: 0; }
  h2 { font-size: 11.5pt; color: var(--teal); font-weight: 600; margin: 20px 0 8px; page-break-after: avoid; }
  p { margin-bottom: 8px; }
  strong { font-weight: 600; }

  table { border-collapse: collapse; width: 100%; margin: 8px 0 14px; font-size: 9.5pt; }
  th { background: var(--teal); color: white; padding: 7px 10px; text-align: left; font-weight: 600; font-size: 9pt; }
  td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: var(--light); }
  td:first-child { font-weight: 500; }

  .callout { border-left: 4px solid var(--teal); background: #f0f6f7; padding: 10px 14px; margin: 10px 0; font-size: 9.5pt; border-radius: 0 4px 4px 0; }
  .callout-gold { border-left-color: var(--gold); background: #fdf8ed; }
  .callout-green { border-left-color: var(--green); background: #f0faf5; }
  .callout strong { color: var(--teal); }
  .callout-gold strong { color: #b8860b; }
  .callout-green strong { color: var(--green); }

  .quote { text-align: center; font-style: italic; color: var(--teal); font-size: 11pt; margin: 25px 20px; padding: 18px; border-top: 2px solid var(--gold); border-bottom: 2px solid var(--gold); line-height: 1.7; }

  ul { padding-left: 18px; margin: 6px 0; }
  li { margin-bottom: 3px; font-size: 10pt; }

  .doc-footer { border-top: 2px solid var(--gold); margin-top: 30px; padding-top: 12px; text-align: center; font-size: 8pt; color: #aaa; }
  .doc-footer strong { color: var(--teal); }
  .sig-block { margin-top: 20px; }
  .sig-name { font-weight: 600; color: var(--teal); font-size: 10.5pt; }
  .sig-title { font-size: 9pt; color: var(--gray); }
  .sig-contact { font-size: 9.5pt; }

  .download-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; background: linear-gradient(135deg, var(--teal), #0f766e); padding: 16px; text-align: center; box-shadow: 0 -4px 20px rgba(0,0,0,0.2); }
  .download-bar button { padding: 12px 40px; background: white; color: var(--teal); border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; }
  .download-bar button:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
  .download-bar span { color: white; font-size: 13px; margin-left: 16px; opacity: 0.9; }

  @media print {
    body { background: white; }
    .doc { box-shadow: none; margin: 0; max-width: none; }
    .page { padding: 0; min-height: auto; }
    .download-bar { display: none !important; }
    h1 { margin-top: 0; }
  }
</style>
</head>
<body>
<div class="doc">

<!-- COVER -->
<div class="page cover">
  <img class="cover-logo" src="data:image/png;base64,$palomaB64" alt="PALOMA">
  <div class="cover-title">Partnership Proposal</div>
  <div class="cover-subtitle">PALOMA Health Technologies + MouthMap</div>
  <div class="cover-tagline">Two Platforms, One Vision &#8212; Building the Future of Patient-Centered Healthcare</div>
  <div class="cover-line"></div>
  <div class="cover-meta">
    <strong>Prepared for:</strong> Dr. Christian Brenes, DMD &#8212; Prosthodontist<br>
    <strong>Prepared by:</strong> W. Chris Harrison &#8212; Think! Design &amp; Planning, LLC<br>
    <strong>Date:</strong> June 14, 2026<br><br>
    <strong>Live Platform:</strong> ljfamilydentist-paloma.netlify.app<br>
    <strong>Admin Dashboard:</strong> ljfamilydentist-paloma.netlify.app/admin<br>
    <strong>Patient Portal:</strong> ljfamilydentist-paloma.netlify.app/portal/patient
  </div>
  <div class="cover-footer">
    <img src="data:image/png;base64,$tvB64" alt="Think! Ventures" style="width:60px; opacity:0.6;">
    <div class="cover-footer-text">A Think! Ventures Cooperative Enterprise</div>
  </div>
</div>

<!-- EXECUTIVE SUMMARY -->
<div class="page">
  <h1>Executive Summary</h1>
  <div class="callout callout-green">
    <strong>Christian &#8212;</strong> I&#8217;m all in. I&#8217;m committing the next two months of full-time development to make PALOMA commercially ready for your network. This proposal formalizes our partnership, compensation framework, and the two-platform strategy that positions us both for long-term success.
  </div>
  <p>This document proposes a partnership built on <strong>two connected platforms</strong>:</p>
  <table>
    <tr><th>Platform</th><th>Purpose</th><th>Ownership</th></tr>
    <tr><td>PALOMA</td><td>AI-powered dental practice management &#8212; the &#8220;Practice Brain&#8221;</td><td><strong>50/50</strong> (Christian + Chris)</td></tr>
    <tr><td>MouthMap</td><td>3D dental/medical visualization engine &#8212; the &#8220;Patient Body&#8221;</td><td><strong>Think! D&amp;P</strong>, licensed exclusively to PALOMA</td></tr>
  </table>
  <div class="callout">
    <strong>Why two platforms?</strong> PALOMA manages dental practices. MouthMap visualizes the human body. They complement each other but serve different markets. PALOMA gets exclusive access to MouthMap for dental practice management &#8212; making it impossible for competitors to match. MouthMap&#8217;s architecture extends beyond dental to orthopedics, dermatology, and other medical specialties as &#8220;BodyMap.&#8221;
  </div>
</div>

<!-- PART 1: PALOMA -->
<div class="page">
  <h1>Part 1: PALOMA Health Technologies LLC</h1>
  <h2>The Business</h2>
  <p>PALOMA is a subscription software platform (SaaS) sold to dental practices on a monthly basis:</p>
  <table>
    <tr><th>Tier</th><th>Monthly Price</th><th>Includes</th></tr>
    <tr><td>Starter</td><td>&#36;500/mo</td><td>PALOMA AI chat, patient portal, basic analytics</td></tr>
    <tr><td>Professional</td><td>&#36;1,000/mo</td><td>+ MouthMap 3D, treatment tracking, secure messaging, PMS integration</td></tr>
    <tr><td>Enterprise</td><td>&#36;1,500/mo</td><td>+ Multi-location, custom AI training, advanced analytics, API access</td></tr>
  </table>

  <h2>Equity Structure</h2>
  <table>
    <tr><th>Founder</th><th>Role</th><th>Ownership</th></tr>
    <tr><td>Christian Brenes</td><td>Clinical Founder &amp; Chief Clinical Officer</td><td><strong>50%</strong></td></tr>
    <tr><td>Chris Harrison <span style="font-weight:400;font-size:8.5pt;color:#888;">(via Think! Ventures LLC)</span></td><td>Technical Co-Founder &amp; CTO</td><td><strong>50%</strong></td></tr>
  </table>
  <div class="callout callout-gold">
    <strong>Why 50/50?</strong> Equal and complementary contributions deserve equal ownership. Christian brings irreplaceable clinical expertise, market access, and the first beta site. Chris designed, built, and deployed the entire working platform &#8212; every line of code, every feature, every system. With Chris committing to full-time development for the next two months, the 50/50 reflects the &#8220;100% effort&#8221; threshold discussed.
  </div>

  <h2>What Each Founder Brings</h2>
  <table>
    <tr><th style="width:50%">Christian (Clinical Founder)</th><th style="width:50%">Chris (Technical Co-Founder)</th></tr>
    <tr><td>Clinical expertise in prosthodontics &amp; implant dentistry</td><td>Built 100% of the working PALOMA platform</td></tr>
    <tr><td>First beta site (Lake Jeanette Family Dentistry)</td><td>Software architecture, AI engineering, cloud infrastructure</td></tr>
    <tr><td>Dental society network for distribution</td><td>Patient portal, admin dashboard, PALOMA AI, 3D viewer</td></tr>
    <tr><td>Clinical validation of AI algorithms</td><td>HIPAA compliance architecture, security engineering</td></tr>
    <tr><td>Business development &amp; practice partnerships</td><td>Ongoing development, maintenance, and operations</td></tr>
  </table>

  <h2>Vesting Schedule</h2>
  <table>
    <tr><th style="width:30%">Term</th><th>Detail</th></tr>
    <tr><td>Schedule</td><td>4-year vest</td></tr>
    <tr><td>Cliff</td><td>2-year cliff &#8212; neither founder earns equity until year 2</td></tr>
    <tr><td>Post-cliff</td><td>Monthly vesting (1/48th per month)</td></tr>
    <tr><td>Exit event</td><td>Full acceleration &#8212; all equity vests immediately on acquisition/merger</td></tr>
    <tr><td>Departure</td><td>Unvested equity forfeited; vested equity retained</td></tr>
  </table>
</div>

<!-- PART 2: COMPENSATION -->
<div class="page">
  <h1>Part 2: Compensation &#8212; When and How We Get Paid</h1>
  <div class="callout callout-gold">
    <strong>Why this section matters:</strong> A clear compensation framework ensures neither founder works indefinitely without pay, and both have financial incentives tied to the company&#8217;s growth.
  </div>

  <h2>Phase 1: The Build (Now &#8594; First 5 Paying Practices)</h2>
  <table>
    <tr><th>Item</th><th>Amount</th><th>Detail</th></tr>
    <tr><td>Founder salaries</td><td>&#36;0</td><td>Both founders work for equity</td></tr>
    <tr><td>Chris&#8217;s development hours</td><td>Tracked at &#36;75/hr</td><td>Deferred &#8212; payable from Company revenue when sustained &#36;10K MRR is reached</td></tr>
    <tr><td>Christian&#8217;s practice beta fee</td><td><strong>&#36;300/month</strong></td><td>Lake Jeanette pays PALOMA &#8212; first revenue and proof of product value</td></tr>
    <tr><td>Operating expenses</td><td>Split 50/50</td><td>Hosting, APIs, domain (~&#36;200&#8211;400/month)</td></tr>
  </table>
  <div class="callout">
    <strong>Why track hours?</strong> Chris is contributing 2 months of full-time skilled labor (market value: &#36;40,000&#8211;80,000). Tracking at a discounted &#36;75/hour creates a fair record. These hours are deferred &#8212; not invoiced &#8212; until the Company generates sustained revenue. Chris&#8217;s primary compensation is his 50% equity stake.
  </div>
  <div class="callout callout-green">
    <strong>Why the &#36;300/month beta fee?</strong> It proves the product has market value from Day 1. &#8220;I pay for this myself&#8221; is the most powerful sales pitch to other dentists. This is the Company&#8217;s first revenue.
  </div>

  <h2>Phase 2: Early Revenue (5&#8211;25 Practices)</h2>
  <table>
    <tr><th>Item</th><th>Amount</th><th>Trigger</th></tr>
    <tr><td>Revenue allocation</td><td>Expenses &#8594; deferred hours repayment &#8594; growth</td><td>&#8212;</td></tr>
    <tr><td>Founder draws</td><td><strong>&#36;2,500/month each</strong></td><td>Sustained &#36;10,000 MRR for 3 months</td></tr>
    <tr><td>Development services</td><td>&#36;75/hour (Think! D&amp;P)</td><td>Paid monthly from Company revenue</td></tr>
  </table>

  <h2>Phase 3: Growth (25+ Practices)</h2>
  <table>
    <tr><th>Item</th><th>Amount</th><th>Trigger</th></tr>
    <tr><td>Founder salaries</td><td><strong>&#36;8,000/month each</strong> (&#36;96K/year)</td><td>Sustained &#36;25,000 MRR for 3 months</td></tr>
    <tr><td>Profit distributions</td><td>Pro-rata per equity (50/50)</td><td>After salaries, expenses, 3-month reserve</td></tr>
    <tr><td>Salary adjustments</td><td>Annual review, mutual consent</td><td>Tied to revenue milestones</td></tr>
  </table>

  <h2>Revenue Projections</h2>
  <table>
    <tr><th>Timeline</th><th>Practices</th><th>Monthly Revenue</th><th>Annual Revenue</th><th>Each Founder&#8217;s 50%</th></tr>
    <tr><td>End of 2026</td><td>10</td><td>&#36;7,500</td><td>&#36;90,000</td><td>~&#36;18,000/yr</td></tr>
    <tr><td>Mid-2027</td><td>25</td><td>&#36;18,750</td><td>&#36;225,000</td><td>~&#36;45,000/yr</td></tr>
    <tr><td>End of 2027</td><td>50</td><td>&#36;37,500</td><td>&#36;450,000</td><td>~&#36;90,000/yr</td></tr>
    <tr><td>2028</td><td>100</td><td>&#36;75,000</td><td>&#36;900,000</td><td>~&#36;180,000/yr</td></tr>
    <tr><td>2029</td><td>250</td><td>&#36;187,500</td><td>&#36;2,250,000</td><td>~&#36;450,000/yr</td></tr>
  </table>

  <h2>Exit Potential</h2>
  <p>SaaS companies are typically acquired at 5&#8211;15x annual revenue:</p>
  <table>
    <tr><th>Practices</th><th>Annual Revenue</th><th>Company Valuation</th><th>Each Founder&#8217;s 50%</th></tr>
    <tr><td>100</td><td>&#36;900K</td><td>&#36;4.5&#8211;13.5M</td><td><strong>&#36;2.25&#8211;6.75M</strong></td></tr>
    <tr><td>250</td><td>&#36;2.25M</td><td>&#36;11&#8211;34M</td><td><strong>&#36;5.6&#8211;17M</strong></td></tr>
    <tr><td>500</td><td>&#36;4.5M</td><td>&#36;22&#8211;67M</td><td><strong>&#36;11&#8211;33M</strong></td></tr>
  </table>
</div>

<!-- PART 3: MOUTHMAP -->
<div class="page">
  <h1>Part 3: MouthMap &#8212; The Visualization Engine</h1>
  <h2>What Is MouthMap?</h2>
  <p>MouthMap is the <strong>3D dental visualization technology</strong> that powers the &#8220;My MouthMap&#8221; patient portal. It renders STL scan files, displays clinical overlays (plaque, decay, bone loss), and enables treatment simulation (implant planning, crown preview).</p>
  <p><strong>It is a separate technology product</strong> &#8212; not just a feature of PALOMA.</p>
  <table>
    <tr><th style="width:50%">MouthMap</th><th style="width:50%">PALOMA</th></tr>
    <tr><td>3D rendering engine (WebGL, Three.js, shaders)</td><td>AI assistant + practice management</td></tr>
    <tr><td>Medical imaging technology</td><td>Business software</td></tr>
    <tr><td>Works for ANY medical specialty</td><td>Dental practices (initially)</td></tr>
    <tr><td>Licensed to schools, surgeons, other platforms</td><td>Sold directly to practices</td></tr>
  </table>

  <h2>Ownership &amp; Licensing</h2>
  <table>
    <tr><th style="width:30%">Term</th><th>Detail</th></tr>
    <tr><td>Owner</td><td>Think! Design and Planning, LLC (Chris Harrison)</td></tr>
    <tr><td>License to PALOMA</td><td><strong>Exclusive</strong> for dental practice management use</td></tr>
    <tr><td>License fee</td><td>&#36;0 during Phase 1&#8211;2; negotiable during Phase 3</td></tr>
    <tr><td>Duration</td><td>Perpetual while Chris is a member of PALOMA HTL</td></tr>
    <tr><td>Non-competing licensing</td><td>Think! D&amp;P may license to dental schools, orthodontics, oral surgery, insurance</td></tr>
  </table>
  <div class="callout callout-green">
    <strong>What PALOMA gets:</strong> Exclusive use of the best 3D dental viewer on the market &#8212; no competitor can use it. Free during startup. Continuous improvements as MouthMap evolves. This is PALOMA&#8217;s competitive moat.
  </div>

  <h2>Christian&#8217;s Role in MouthMap</h2>
  <table>
    <tr><th style="width:30%">Term</th><th>Detail</th></tr>
    <tr><td>Title</td><td>Clinical Advisory Board &#8212; Dental</td></tr>
    <tr><td>Compensation</td><td>&#36;3,000/month advisory fee (begins Phase 2)</td></tr>
    <tr><td>Advisory equity</td><td>5&#8211;10% of MouthMap (standard advisor grant, 2-year vest)</td></tr>
    <tr><td>Responsibilities</td><td>Clinical validation, scan data review, dental module feedback</td></tr>
  </table>
  <div class="callout">
    <strong>Why this structure?</strong> MouthMap extends far beyond dental. Chris plans to develop &#8220;BodyMap&#8221; &#8212; a universal medical visualization engine covering orthopedics, dermatology, cardiology, and more. Each specialty will have its own clinical advisor. Christian is the foundational dental advisor &#8212; not the owner of the visualization engine for every medical specialty.
  </div>

  <h2>The BodyMap Vision</h2>
  <table>
    <tr><th>Module</th><th>Specialty</th><th>Clinical Advisor</th></tr>
    <tr><td><strong>MouthMap</strong></td><td>Dental</td><td>Christian Brenes (you)</td></tr>
    <tr><td>JointMap</td><td>Orthopedics</td><td>TBD</td></tr>
    <tr><td>SkinMap</td><td>Dermatology</td><td>TBD</td></tr>
    <tr><td>SpineMap</td><td>Neurology</td><td>TBD</td></tr>
    <tr><td>HeartMap</td><td>Cardiology</td><td>TBD</td></tr>
  </table>
</div>

<!-- PART 4: SPRINT -->
<div class="page">
  <h1>Part 4: The 2-Month Sprint &#8212; My Commitment</h1>
  <div class="callout callout-green">
    <strong>Full-time commitment:</strong> I&#8217;m dedicating the next 8 weeks of full-time development (40+ hours/week) to transform PALOMA from a stunning demo into a commercially-ready product you can sell to your network.
  </div>

  <h2>What I&#8217;ll Deliver by Mid-August</h2>
  <table>
    <tr><th style="width:18%">Week</th><th>Deliverables</th></tr>
    <tr><td>1&#8211;2</td><td>All bugs fixed, mobile responsive portal, real STL file rendering, HIPAA audit</td></tr>
    <tr><td>3&#8211;4</td><td>Multi-practice architecture (onboard new dentists in minutes), practice customization</td></tr>
    <tr><td>5&#8211;6</td><td>Stripe billing integration (automatic monthly payments), patient data import pipeline</td></tr>
    <tr><td>7&#8211;8</td><td>Marketing landing page, demo mode for sales, pricing + signup flow, admin analytics</td></tr>
  </table>

  <h2>What I Need From You During the Sprint</h2>
  <table>
    <tr><th style="width:30%">Your Commitment</th><th>Detail</th></tr>
    <tr><td>Beta fee</td><td>&#36;300/month from Lake Jeanette starting now</td></tr>
    <tr><td>Clinical feedback</td><td>Weekly 30-min check-in call + async text/email</td></tr>
    <tr><td>Sales prep</td><td>Identify 5&#8211;10 dentist colleagues to demo in August</td></tr>
    <tr><td>Scan data</td><td>Sample STL files and de-identified patient records for testing</td></tr>
    <tr><td>Suggestions report</td><td>Send your second report so I can prioritize features</td></tr>
  </table>

  <h2>After the Sprint (August &#8594; End of Year)</h2>
  <table>
    <tr><th>Month</th><th>Activity</th><th>Projected Revenue</th></tr>
    <tr><td>August</td><td>Christian demos to 5 dentist colleagues</td><td>&#36;300/mo</td></tr>
    <tr><td>September</td><td>3 practices sign up at intro rate</td><td>&#36;1,800/mo</td></tr>
    <tr><td>October</td><td>2 more practices from referrals</td><td>&#36;2,800/mo</td></tr>
    <tr><td>November</td><td>Word spreads, 3 more practices</td><td>&#36;4,300/mo</td></tr>
    <tr><td>December</td><td>10 total practices</td><td>&#36;5,200/mo (~&#36;62K annualized)</td></tr>
  </table>
</div>

<!-- PART 5: STRUCTURE + HOW WE WIN -->
<div class="page">
  <h1>Part 5: Business Structure</h1>
  <h2>Entity Map</h2>
  <table>
    <tr><th>Entity</th><th>Role</th><th>Owner</th></tr>
    <tr><td>Paloma Health Technologies LLC</td><td>The Company &#8212; owns PALOMA product, brand, revenue</td><td>50/50 Christian + Think! Ventures</td></tr>
    <tr><td>Think! Ventures LLC</td><td>Chris&#8217;s holding company &#8212; holds his 50% equity stake</td><td>Chris Harrison</td></tr>
    <tr><td>Think! Design and Planning, LLC</td><td>Chris&#8217;s services company &#8212; owns MouthMap, bills for dev work</td><td>Chris Harrison</td></tr>
    <tr><td>Lake Jeanette Family Dentistry</td><td>Christian&#8217;s practice &#8212; first beta site and clinical partner</td><td>Christian Brenes</td></tr>
  </table>

  <h2>How Data Flows</h2>
  <ul>
    <li>Patient visits Christian&#8217;s practice &#8594; iTero/3Shape scanner captures STL</li>
    <li>PALOMA ingests scan data (PALOMA owns the practice relationship)</li>
    <li>MouthMap renders the 3D visualization (MouthMap is the rendering engine)</li>
    <li>Patient sees their scan in My MouthMap portal</li>
    <li>Anonymized data (with consent) feeds MouthMap AI training</li>
  </ul>

  <h1>Part 6: How We Both Win</h1>
  <h2>Christian&#8217;s Income from PALOMA Partnership (Year 2)</h2>
  <table>
    <tr><th style="width:60%">Source</th><th>Estimate</th></tr>
    <tr><td>PALOMA profit share (50%)</td><td>&#36;90,000</td></tr>
    <tr><td>PALOMA founder salary</td><td>&#36;96,000</td></tr>
    <tr><td>MouthMap advisory fees</td><td>&#36;36,000</td></tr>
    <tr><td><strong>Total from PALOMA partnership</strong></td><td><strong>&#36;222,000/year</strong></td></tr>
  </table>

  <h2>Chris&#8217;s Income from PALOMA Partnership (Year 2)</h2>
  <table>
    <tr><th style="width:60%">Source</th><th>Estimate</th></tr>
    <tr><td>PALOMA profit share (50%)</td><td>&#36;90,000</td></tr>
    <tr><td>PALOMA founder salary</td><td>&#36;96,000</td></tr>
    <tr><td>Think! D&amp;P development services</td><td>&#36;50,000</td></tr>
    <tr><td>MouthMap licensing (dental schools, etc.)</td><td>&#36;75,000+</td></tr>
    <tr><td><strong>Total</strong></td><td><strong>&#36;311,000+/year</strong></td></tr>
  </table>

  <div class="quote">
    &#8220;I built PALOMA because I believe in what it can be. You saw it and believed too. That&#8217;s why we&#8217;re here. This structure gives us both a fair deal, clear expectations, and a real path to building something worth millions. Let&#8217;s make it happen.&#8221;
  </div>
</div>

<!-- NEXT STEPS -->
<div class="page">
  <h1>Next Steps</h1>
  <table>
    <tr><th style="width:6%">#</th><th>Action</th><th style="width:22%">When</th><th style="width:18%">Who</th></tr>
    <tr><td>1</td><td>Review this proposal</td><td>This week</td><td>Christian</td></tr>
    <tr><td>2</td><td>Call to discuss and negotiate</td><td>This week</td><td>Both</td></tr>
    <tr><td>3</td><td>Both engage NC business attorneys</td><td>Next week</td><td>Both</td></tr>
    <tr><td>4</td><td>Sign founder agreement + Dev Services Agreement</td><td>Before July 1</td><td>Both</td></tr>
    <tr><td>5</td><td>Form Paloma Health Technologies LLC</td><td>Within 30 days</td><td>Both</td></tr>
    <tr><td>6</td><td>Chris begins 2-month full-time sprint</td><td>Immediately</td><td>Chris</td></tr>
    <tr><td>7</td><td>Christian sends suggestions report + preps sales pipeline</td><td>During sprint</td><td>Christian</td></tr>
    <tr><td>8</td><td>Product ready for commercial demo</td><td>Mid-August</td><td>Chris delivers</td></tr>
    <tr><td>9</td><td>Christian begins selling to dental network</td><td>Aug&#8211;Sept</td><td>Christian</td></tr>
    <tr><td>10</td><td>First paying practices onboard</td><td>Sept&#8211;Oct</td><td>Both</td></tr>
  </table>

  <div class="sig-block" style="margin-top:40px;">
    <table style="border:none; margin:0;">
    <tr>
    <td style="border:none; width:60%; vertical-align:top; padding:0;">
      <div class="sig-name">W. Chris Harrison</div>
      <div class="sig-title">Technical Co-Founder | Think! Design &amp; Planning, LLC</div>
      <div class="sig-contact">(336) 488-0203 | chris@thinkdesignandplanning.com</div>
    </td>
    <td style="border:none; width:40%; vertical-align:top; text-align:right; padding:0;">
      <img src="data:image/png;base64,$tvFooterB64" alt="Think! Ventures" style="width:100px;">
    </td>
    </tr>
    </table>
  </div>

  <div class="doc-footer">
    <strong>PALOMA Health Technologies</strong> &#8212; Patient Advocacy &amp; Lifecycle Oral Map Assistant<br>
    A Think! Ventures Cooperative Enterprise<br>
    <span style="color:#ccc;">Draft for Discussion &#8212; Prepared exclusively for Dr. Christian Brenes, DMD</span>
  </div>
</div>

</div>

<div class="download-bar">
  <button onclick="window.print()">Save as PDF</button>
  <span>Use &#8220;Save as PDF&#8221; as the printer destination</span>
</div>

</body>
</html>
"@

$outPath = "c:\Users\Chris\Desktop\WEBSITES\Brenes Precision Dentistry\PALOMA_Partnership_Proposal.html"
[System.IO.File]::WriteAllText($outPath, $html, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done! Saved to: $outPath"
Write-Host "Open in browser and use Save as PDF"
