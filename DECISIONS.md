# DECISIONS.md

## Decision Log

### 2024-03-24: Data Model v1

**Status:** Approved  
**Context:** Need a data model that supports the full creator campaign lifecycle: discovery → outreach → onboarding → briefs → agreements → shipping → content → posting → revenue tracking.

---

## Core Data Model

### Entity Ownership Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        THREE-TIER DATA OWNERSHIP                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GLOBAL (shared across all brands)                                          │
│  ─────────────────────────────────                                          │
│  Creator ──┬── CreatorPlatform ◄──► Platform                                │
│            ├── Address                                                      │
│            └── (identity, profile, social handles)                          │
│                                                                             │
│  BRAND-LEVEL (relationship between brand and creator)                       │
│  ────────────────────────────────────────────────────                       │
│  BrandCreator ──┬── lead_status (discovered → active)                       │
│                 ├── Outreach (general/prospecting)                          │
│                 ├── brand-specific notes, tags, source                      │
│                 └── relationship lifecycle                                  │
│                                                                             │
│  CAMPAIGN-LEVEL (execution within a specific campaign)                      │
│  ─────────────────────────────────────────────────────                      │
│  CampaignCreator ──┬── participation_status (invited → completed)           │
│                    ├── Agreement                                            │
│                    ├── Shipment                                             │
│                    ├── Content ── ContentMetrics                            │
│                    ├── Payment                                              │
│                    └── campaign execution lifecycle                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Entity Overview

```
                              GLOBAL LAYER
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  Creator ──────┬──► CreatorPlatform ◄──► Platform                           │
│  (identity)    └──► Address                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1:N (one creator, many brand relationships)
                                    ▼
                             BRAND LAYER
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  Brand ──────────┬──► BrandCreator ◄───────────────┐                        │
│                  │    (lead lifecycle)             │                        │
│                  │         │                       │                        │
│                  │         └──► Outreach           │                        │
│                  │              (prospecting)      │                        │
│                  │                                 │                        │
│                  ├──► Campaign ◄───────────────────┤                        │
│                  │                                 │                        │
│                  ├──► Product                      │                        │
│                  │                                 │                        │
│                  └──► BrandCreatorTag ◄──► Tag     │                        │
│                                                    │                        │
└────────────────────────────────────────────────────┼────────────────────────┘
                                                     │
                                    │ 1:N (one brand-creator, many campaigns)
                                    ▼
                            CAMPAIGN LAYER
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  CampaignCreator ──────┬──► Agreement                                       │
│  (execution lifecycle) │                                                    │
│                        ├──► Shipment ──► ShipmentItem ◄── Product           │
│                        │                                                    │
│                        ├──► Content ──► ContentMetrics                      │
│                        │           └──► ContentRevision                     │
│                        │                                                    │
│                        ├──► Payment                                         │
│                        │                                                    │
│                        └──► Outreach (campaign-specific)                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Entities

### Brand
The company or business running creator campaigns.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | string | required |
| logo_url | string | nullable |
| website | string | nullable |
| industry | string | nullable |
| billing_email | string | nullable |
| created_at | timestamp | |
| updated_at | timestamp | |

---

### User
System users who operate the platform (brand team members, admins).

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| brand_id | uuid | FK → Brand, nullable for platform admins |
| email | string | required, unique |
| name | string | required |
| role | enum | `admin`, `manager`, `member` |
| avatar_url | string | nullable |
| created_at | timestamp | |
| updated_at | timestamp | |

---

### Creator
An influencer or content creator. **Global identity only** — no relationship state here.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| email | string | nullable, unique if present |
| name | string | required |
| phone | string | nullable |
| bio | text | nullable |
| avatar_url | string | nullable |
| country | string | ISO 3166-1 alpha-2 |
| city | string | nullable |
| primary_platform | string | nullable, e.g. `instagram`, `tiktok` |
| tier | enum | `nano`, `micro`, `mid`, `macro`, `mega` |
| created_at | timestamp | |
| updated_at | timestamp | |

**Note:** No `status` field here. Relationship status lives on `BrandCreator`. A creator can be "active" with Brand A and "discovered" with Brand B simultaneously.

---

### Platform
Social media platforms (reference table).

| Field | Type | Notes |
|-------|------|-------|
| id | string | PK, e.g. `instagram`, `tiktok`, `youtube` |
| name | string | display name |
| icon_url | string | nullable |
| base_url | string | for building profile links |

---

### CreatorPlatform
A creator's presence on a specific platform.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| creator_id | uuid | FK → Creator |
| platform_id | string | FK → Platform |
| handle | string | username on platform |
| profile_url | string | full URL |
| follower_count | integer | nullable |
| following_count | integer | nullable |
| engagement_rate | decimal | nullable, percentage |
| avg_views | integer | nullable |
| verified | boolean | default false |
| last_synced_at | timestamp | nullable |
| created_at | timestamp | |
| updated_at | timestamp | |

**Unique constraint:** (creator_id, platform_id)

---

### Address
Shipping addresses for creators.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| creator_id | uuid | FK → Creator |
| label | string | e.g. "Home", "Office" |
| recipient_name | string | name for shipping label |
| street_1 | string | |
| street_2 | string | nullable |
| city | string | |
| state | string | nullable |
| postal_code | string | |
| country | string | ISO 3166-1 alpha-2 |
| phone | string | nullable, for courier |
| is_default | boolean | default false |
| created_at | timestamp | |
| updated_at | timestamp | |

---

### Tag
Tags for categorizing creators (niches, tiers, custom labels).

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | string | required |
| type | enum | `niche`, `tier`, `custom` |
| color | string | nullable, hex code for UI |
| created_at | timestamp | |

---

### CreatorTag
Join table for **global** creator tagging (platform-wide, not brand-specific).

| Field | Type | Notes |
|-------|------|-------|
| creator_id | uuid | FK → Creator |
| tag_id | uuid | FK → Tag |

**Primary key:** (creator_id, tag_id)

**Note:** For brand-specific tagging, use `BrandCreatorTag` instead.

---

### BrandCreator
**The brand-level relationship record.** This is where lead/relationship lifecycle lives.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| brand_id | uuid | FK → Brand |
| creator_id | uuid | FK → Creator |
| status | enum | see below |
| source | string | how this brand discovered them |
| source_detail | string | nullable, e.g. "Instagram hashtag #skincare" |
| fit_score | integer | nullable, 1-100 brand fit rating |
| notes | text | brand-specific internal notes |
| tags | string[] | brand-specific tags (denormalized for speed) |
| first_contacted_at | timestamp | nullable |
| last_contacted_at | timestamp | nullable |
| last_active_at | timestamp | nullable, last campaign participation |
| do_not_contact | boolean | default false |
| do_not_contact_reason | string | nullable |
| created_at | timestamp | |
| updated_at | timestamp | |

**Unique constraint:** (brand_id, creator_id)

**BrandCreator.status values (Lead Lifecycle):**
- `discovered` — found but not researched
- `researching` — actively gathering data
- `qualified` — passed criteria, ready for outreach
- `unqualified` — does not meet criteria
- `contacted` — at least one outreach sent
- `engaged` — creator responded positively
- `active` — in good standing, available for campaigns
- `paused` — temporarily unavailable
- `churned` — previously active, no longer engaging
- `blacklisted` — do not contact (policy violation or opt-out)

---

### BrandCreatorTag
Brand-specific tagging for creators.

| Field | Type | Notes |
|-------|------|-------|
| brand_creator_id | uuid | FK → BrandCreator |
| tag_id | uuid | FK → Tag |

**Primary key:** (brand_creator_id, tag_id)

---

### Campaign
A marketing campaign run by a brand.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| brand_id | uuid | FK → Brand |
| name | string | required |
| description | text | nullable |
| objective | enum | `awareness`, `engagement`, `conversions`, `content`, `other` |
| budget | decimal | nullable, total budget |
| currency | string | default `USD` |
| start_date | date | nullable |
| end_date | date | nullable |
| status | enum | see below |
| target_platforms | string[] | array of platform_ids |
| target_creator_count | integer | nullable |
| created_by | uuid | FK → User |
| created_at | timestamp | |
| updated_at | timestamp | |

**Campaign.status values:**
- `draft` — being set up
- `recruiting` — finding/inviting creators
- `active` — in progress
- `paused` — temporarily halted
- `completed` — finished
- `cancelled` — terminated early

---

### Brief
Campaign brief document for creators.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| campaign_id | uuid | FK → Campaign |
| title | string | required |
| overview | text | campaign overview |
| deliverables | jsonb | structured list of required content |
| guidelines | text | content guidelines |
| dos | text[] | things to do |
| donts | text[] | things to avoid |
| talking_points | text[] | key messages |
| hashtags | string[] | required hashtags |
| mentions | string[] | required mentions |
| links | jsonb | links to include (UTM, etc.) |
| reference_content | jsonb | example content URLs |
| deadline | date | nullable |
| version | integer | default 1 |
| status | enum | `draft`, `active`, `archived` |
| created_at | timestamp | |
| updated_at | timestamp | |

---

### CampaignCreator
**The campaign execution record.** Links a brand-creator relationship to a specific campaign. This is where campaign participation and execution workflow lives.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| campaign_id | uuid | FK → Campaign |
| brand_creator_id | uuid | FK → BrandCreator |
| status | enum | see below |
| rate | decimal | nullable, agreed fee |
| rate_type | enum | `flat`, `per_post`, `per_view`, `affiliate` |
| currency | string | default `USD` |
| affiliate_code | string | nullable |
| affiliate_rate | decimal | nullable, percentage or flat |
| platform_id | string | FK → Platform, primary platform for this campaign |
| deliverable_count | integer | expected number of posts |
| notes | text | campaign-specific notes |
| shortlisted_at | timestamp | nullable |
| invited_at | timestamp | nullable |
| accepted_at | timestamp | nullable |
| ready_at | timestamp | nullable |
| completed_at | timestamp | nullable |
| created_at | timestamp | |
| updated_at | timestamp | |

**Unique constraint:** (campaign_id, brand_creator_id)

**CampaignCreator.status values (Participation Lifecycle):**

*Recruitment Phase:*
- `shortlisted` — added to campaign consideration, no outreach yet
- `invited` — campaign invitation sent
- `reminded` — follow-up reminder sent
- `negotiating` — creator responded, discussing terms
- `accepted` — creator agreed to participate
- `declined` — creator rejected invitation
- `ghosted` — no response after all attempts

*Onboarding Phase:*
- `onboarding` — completing agreement, address, etc.
- `ready` — fully onboarded, ready for execution

*Execution Phase:*
- `shipped` — product sent (if applicable)
- `creating` — working on content
- `in_review` — content submitted, under review
- `revision` — changes requested
- `approved` — content approved, ready to post
- `posting` — content being posted
- `posted` — content is live
- `completed` — campaign finished for this creator

*Terminal:*
- `dropped` — removed from campaign (brand decision)
- `withdrawn` — creator withdrew after accepting

---

### Outreach
Tracks all outreach communications with creators. **Owned by either BrandCreator (prospecting) or CampaignCreator (campaign-specific).**

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| brand_creator_id | uuid | FK → BrandCreator, nullable if campaign-specific |
| campaign_creator_id | uuid | FK → CampaignCreator, nullable if prospecting |
| user_id | uuid | FK → User, who sent it |
| channel | enum | `email`, `instagram_dm`, `tiktok_dm`, `other` |
| subject | string | nullable, for emails |
| message | text | outreach content |
| template_id | uuid | nullable, FK → OutreachTemplate |
| status | enum | see below |
| sent_at | timestamp | |
| opened_at | timestamp | nullable |
| replied_at | timestamp | nullable |
| created_at | timestamp | |

**Constraint:** Exactly one of `brand_creator_id` or `campaign_creator_id` must be set.

**Outreach.status values:**
- `draft` — not sent yet
- `scheduled` — queued for future send
- `sending` — currently being sent (transient)
- `sent` — delivered to channel
- `delivered` — confirmed delivered (email only)
- `opened` — email opened (if tracked)
- `clicked` — link clicked (if tracked)
- `replied` — creator responded
- `bounced` — delivery failed permanently
- `failed` — send failed (may retry)
- `expired` — scheduled but cancelled/timed out
- `no_response` — marked as no reply after N days

---

### OutreachTemplate
Reusable outreach message templates.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| brand_id | uuid | FK → Brand |
| name | string | template name |
| channel | enum | `email`, `instagram_dm`, `tiktok_dm`, `other` |
| subject | string | nullable, for emails |
| body | text | template content with placeholders |
| created_at | timestamp | |
| updated_at | timestamp | |

---

### Agreement
Contract/agreement between brand and creator for a campaign.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| campaign_creator_id | uuid | FK → CampaignCreator |
| brief_id | uuid | FK → Brief, nullable |
| title | string | e.g. "Campaign Agreement" |
| terms | text | full agreement text |
| compensation | jsonb | structured compensation details |
| usage_rights | text | content usage terms |
| exclusivity | text | nullable, exclusivity terms |
| start_date | date | nullable |
| end_date | date | nullable |
| document_url | string | nullable, signed PDF |
| status | enum | see below |
| sent_at | timestamp | nullable |
| viewed_at | timestamp | nullable |
| signed_at | timestamp | nullable |
| countersigned_at | timestamp | nullable |
| created_at | timestamp | |
| updated_at | timestamp | |

**Agreement.status values:**
- `draft` — being prepared
- `sent` — sent to creator
- `viewed` — creator opened it
- `signed` — creator signed
- `countersigned` — brand countersigned (fully executed)
- `expired` — not signed in time
- `terminated` — cancelled/ended early

---

### Product
Products that can be shipped to creators.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| brand_id | uuid | FK → Brand |
| name | string | required |
| sku | string | nullable |
| description | text | nullable |
| image_url | string | nullable |
| value | decimal | nullable, retail value |
| currency | string | default `USD` |
| weight_grams | integer | nullable, for shipping |
| is_active | boolean | default true |
| created_at | timestamp | |
| updated_at | timestamp | |

---

### Shipment
A shipment of products to a creator.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| campaign_creator_id | uuid | FK → CampaignCreator |
| address_id | uuid | FK → Address |
| carrier | string | e.g. `usps`, `fedex`, `dhl` |
| tracking_number | string | nullable |
| tracking_url | string | nullable |
| status | enum | see below |
| notes | text | nullable |
| shipped_at | timestamp | nullable |
| estimated_delivery | date | nullable |
| delivered_at | timestamp | nullable |
| created_at | timestamp | |
| updated_at | timestamp | |

**Shipment.status values:**
- `pending` — not shipped yet
- `label_created` — shipping label generated
- `shipped` — handed to carrier
- `in_transit` — on the way
- `out_for_delivery` — arriving today
- `delivered` — confirmed delivered
- `failed` — delivery failed
- `returned` — returned to sender

---

### ShipmentItem
Line items in a shipment.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| shipment_id | uuid | FK → Shipment |
| product_id | uuid | FK → Product |
| quantity | integer | default 1 |

---

### Content
Content pieces created by creators for a campaign.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| campaign_creator_id | uuid | FK → CampaignCreator |
| platform_id | string | FK → Platform |
| type | enum | `post`, `story`, `reel`, `video`, `short`, `tweet`, `other` |
| title | string | nullable |
| caption | text | nullable |
| file_urls | string[] | uploaded content files |
| thumbnail_url | string | nullable |
| post_url | string | nullable, URL once posted |
| post_id | string | nullable, platform's post ID |
| scheduled_for | timestamp | nullable |
| posted_at | timestamp | nullable |
| status | enum | see below |
| revision_count | integer | default 0 |
| approved_by | uuid | FK → User, nullable |
| approved_at | timestamp | nullable |
| notes | text | nullable |
| created_at | timestamp | |
| updated_at | timestamp | |

**Content.status values:**
- `draft` — creator working on it
- `submitted` — sent for review
- `approved` — approved, ready to post
- `revision_requested` — needs changes
- `scheduled` — scheduled to post
- `posted` — live on platform
- `rejected` — not approved, won't be used
- `removed` — taken down after posting

---

### ContentRevision
Feedback and revision requests on content.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| content_id | uuid | FK → Content |
| user_id | uuid | FK → User, who requested |
| feedback | text | revision feedback |
| file_urls | string[] | nullable, annotated screenshots etc. |
| created_at | timestamp | |

---

### ContentMetrics
Performance metrics for posted content (time-series friendly).

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| content_id | uuid | FK → Content |
| recorded_at | timestamp | when metrics were captured |
| views | integer | nullable |
| impressions | integer | nullable |
| reach | integer | nullable |
| likes | integer | nullable |
| comments | integer | nullable |
| shares | integer | nullable |
| saves | integer | nullable |
| clicks | integer | nullable |
| engagement_rate | decimal | nullable, calculated |
| watch_time_seconds | integer | nullable, for video |
| avg_watch_percentage | decimal | nullable |
| created_at | timestamp | |

**Note:** Multiple records per content_id to track metrics over time.

---

### Payment
Payments to creators.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| campaign_creator_id | uuid | FK → CampaignCreator |
| amount | decimal | required |
| currency | string | default `USD` |
| type | enum | `flat_fee`, `milestone`, `bonus`, `affiliate` |
| description | string | nullable |
| status | enum | see below |
| payment_method | string | nullable, e.g. `paypal`, `bank`, `payoneer` |
| external_reference | string | nullable, transaction ID |
| due_date | date | nullable |
| paid_at | timestamp | nullable |
| created_at | timestamp | |
| updated_at | timestamp | |

**Payment.status values:**
- `pending` — not yet due
- `due` — ready to pay
- `processing` — payment initiated
- `paid` — completed
- `failed` — payment failed
- `cancelled` — won't be paid

---

### AffiliateClick
Tracks clicks on affiliate/tracking links.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| campaign_creator_id | uuid | FK → CampaignCreator |
| content_id | uuid | FK → Content, nullable |
| url | string | the tracked URL |
| ip_hash | string | hashed IP for dedup |
| user_agent | string | nullable |
| referrer | string | nullable |
| country | string | nullable |
| clicked_at | timestamp | |

---

### AffiliateConversion
Tracks conversions from affiliate links.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| campaign_creator_id | uuid | FK → CampaignCreator |
| content_id | uuid | FK → Content, nullable |
| click_id | uuid | FK → AffiliateClick, nullable |
| order_id | string | external order reference |
| order_value | decimal | |
| commission | decimal | creator's commission |
| currency | string | default `USD` |
| status | enum | `pending`, `confirmed`, `rejected`, `paid` |
| converted_at | timestamp | |
| created_at | timestamp | |

---

## Key Relationships Summary

| Relationship | Type | Description |
|--------------|------|-------------|
| **Global Layer** | | |
| Creator → CreatorPlatform | 1:N | Creator on multiple platforms |
| Creator → Address | 1:N | Multiple shipping addresses |
| | | |
| **Brand Layer** | | |
| Brand → BrandCreator | 1:N | Brand's relationship with creators |
| Creator → BrandCreator | 1:N | Creator can have relationships with many brands |
| Brand → Campaign | 1:N | Brand runs many campaigns |
| Brand → Product | 1:N | Brand has product catalog |
| Brand → User | 1:N | Brand has team members |
| BrandCreator → Outreach | 1:N | Prospecting communications |
| | | |
| **Campaign Layer** | | |
| Campaign → CampaignCreator | 1:N | Campaign has many participants |
| BrandCreator → CampaignCreator | 1:N | Same creator can be in many campaigns for same brand |
| CampaignCreator → Agreement | 1:1 | Each participation has one agreement |
| CampaignCreator → Shipment | 1:N | May have multiple shipments |
| CampaignCreator → Content | 1:N | Creator submits multiple pieces |
| CampaignCreator → Payment | 1:N | May have multiple payments |
| CampaignCreator → Outreach | 1:N | Campaign-specific communications |
| Content → ContentMetrics | 1:N | Metrics tracked over time |
| Shipment → ShipmentItem | 1:N | Shipment contains products |

---

## Notes & Open Questions

1. **Multi-tenancy:** Model assumes single-tenant per brand. May need `brand_id` on more tables if building true multi-tenant SaaS.

2. **Creator ownership:** ✅ RESOLVED — Creators are global (identity only). Brand-specific relationship state lives on `BrandCreator`. Campaign-specific execution state lives on `CampaignCreator`.

3. **Content approval workflow:** Current model is simple (submitted → approved/revision). May need more complex workflow engine later.

4. **Payment integration:** Payment table is tracking-only. Actual payment processing TBD (Stripe Connect, PayPal Payouts, etc.).

5. **Metrics ingestion:** ContentMetrics assumes manual or API-based collection. Platform API integration patterns TBD.

6. **File storage:** All `*_url` fields assume external storage (S3, etc.). Storage strategy TBD.

7. **Soft deletes:** Not modeled yet. May want `deleted_at` on key tables.

8. **Audit logging:** Not modeled. May want separate audit log or use DB triggers.

---

## Workflow & State Models

### 2024-03-24: Workflow Definitions v1.1

**Status:** Approved (Updated)  
**Context:** Define complete state machines for all major workflows to enable consistent implementation across the platform.

---

## Workflow Ownership Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WORKFLOW → ENTITY OWNERSHIP MAP                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BRAND LAYER (BrandCreator)                                                 │
│  ─────────────────────────────                                              │
│  • Lead Lifecycle ──────────► BrandCreator.status                           │
│  • Outreach (prospecting) ──► Outreach.status (brand_creator_id set)        │
│                                                                             │
│  CAMPAIGN LAYER (CampaignCreator)                                           │
│  ────────────────────────────────                                           │
│  • Prospect/Participation ──► CampaignCreator.status                        │
│  • Outreach (campaign) ─────► Outreach.status (campaign_creator_id set)     │
│  • Agreement ───────────────► Agreement.status                              │
│  • Shipment ────────────────► Shipment.status                               │
│  • Content ─────────────────► Content.status                                │
│  • Posting/Performance ─────► Content.status (post-approval states)         │
│                                                                             │
│  STANDALONE                                                                 │
│  ──────────                                                                 │
│  • Campaign Lifecycle ──────► Campaign.status                               │
│  • Payment ─────────────────► Payment.status                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Workflow Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CREATOR CAMPAIGN OS                               │
│                         Workflow State Machine Map                          │
└─────────────────────────────────────────────────────────────────────────────┘

       BRAND LAYER                              CAMPAIGN LAYER
       ───────────                              ──────────────
                                    
  ┌──────────────────┐         ┌──────────────────────────────────────────────┐
  │   LEAD WORKFLOW  │         │  PARTICIPATION      EXECUTION                │
  │  (BrandCreator)  │         │  ─────────────      ─────────                │
  │                  │         │                                              │
  │  discovered      │         │  ┌───────────┐    ┌───────────┐              │
  │       ↓          │────────▶│  │ PROSPECT  │───▶│ AGREEMENT │              │
  │  researching     │         │  │ Workflow  │    │ Workflow  │              │
  │       ↓          │         │  │(Campaign- │    └───────────┘              │
  │  qualified       │         │  │ Creator)  │          │                    │
  │       ↓          │         │  └───────────┘          ▼                    │
  │  contacted ◄─────┼─────────┼────────┘          ┌───────────┐              │
  │       ↓          │         │                   │ SHIPMENT  │              │
  │  engaged         │         │                   │ Workflow  │              │
  │       ↓          │         │                   └───────────┘              │
  │  active ─────────┼─────────┼──▶ (new campaign        │                    │
  │                  │         │     invitation)         ▼                    │
  └──────────────────┘         │                   ┌───────────┐              │
                               │                   │ CONTENT   │              │
  ┌──────────────────┐         │                   │ Workflow  │              │
  │ OUTREACH WORKFLOW│         │                   └───────────┘              │
  │   (Outreach)     │         │                         │                    │
  │                  │         │                         ▼                    │
  │  Can attach to:  │         │                   ┌───────────┐              │
  │  • BrandCreator  │         │                   │ POSTING   │              │
  │    (prospecting) │         │                   │ Workflow  │              │
  │  • CampaignCreator│        │                   └───────────┘              │
  │    (campaign)    │         │                                              │
  └──────────────────┘         └──────────────────────────────────────────────┘
```

---

## 1. Lead Lifecycle

**Entity:** `BrandCreator`  
**Field:** `status`  
**Purpose:** Track a creator's relationship with a specific brand, from discovery through to active roster.

**Key insight:** A creator can be `active` with Brand A while simultaneously being `discovered` with Brand B. The global `Creator` entity holds only identity/profile data.

### States

| State | Description |
|-------|-------------|
| `discovered` | Creator found via search, scraping, or referral. No contact made. |
| `researching` | Actively gathering data (metrics, content quality, brand fit). |
| `qualified` | Passed qualification criteria. Ready for outreach. |
| `unqualified` | Does not meet criteria for this brand. |
| `contacted` | At least one outreach attempt made by this brand. |
| `engaged` | Creator has responded positively to this brand's outreach. |
| `active` | In good standing with this brand. Available for campaign invitations. |
| `paused` | Temporarily unavailable for this brand. |
| `churned` | Previously active with this brand, no longer engaging. |
| `blacklisted` | Do not contact from this brand. Policy violation or opt-out. |

### State Diagram

```
                                    ┌─────────────┐
                                    │ blacklisted │ ◀──── [any state]
                                    └─────────────┘       (manual override)
                                           
┌────────────┐     ┌─────────────┐     ┌───────────┐
│ discovered │────▶│ researching │────▶│ qualified │
└────────────┘     └─────────────┘     └───────────┘
      │                   │                  │
      │                   ▼                  │
      │            ┌─────────────┐           │
      │            │ unqualified │           │
      │            └─────────────┘           │
      │                                      ▼
      └─────────────────────────────▶ ┌───────────┐
                                      │ contacted │
                                      └───────────┘
                                            │
                              ┌─────────────┼─────────────┐
                              ▼             ▼             ▼
                       ┌─────────┐   ┌─────────┐   ┌─────────────┐
                       │ engaged │   │ churned │   │ unqualified │
                       └─────────┘   └─────────┘   └─────────────┘
                              │
                              ▼
                        ┌──────────┐
                        │  active  │◀────────┐
                        └──────────┘         │
                              │              │
                        ┌─────┴─────┐        │
                        ▼           ▼        │
                  ┌─────────┐ ┌─────────┐    │
                  │ paused  │ │ churned │    │
                  └─────────┘ └─────────┘    │
                        │                    │
                        └────────────────────┘
```

### Transitions

| From | To | Trigger | Auto/Manual |
|------|----|---------|-------------|
| `discovered` | `researching` | User initiates research | Manual |
| `discovered` | `contacted` | Outreach sent (skip research) | Auto |
| `researching` | `qualified` | Passes qualification criteria | Manual |
| `researching` | `unqualified` | Fails qualification criteria | Manual |
| `qualified` | `contacted` | First outreach sent | Auto |
| `contacted` | `engaged` | Creator replies positively | Manual |
| `contacted` | `churned` | No response after N attempts | Auto (configurable) |
| `contacted` | `unqualified` | Creator declines or bad fit | Manual |
| `engaged` | `active` | First campaign completed OR manual activation | Manual |
| `active` | `paused` | Creator or brand requests pause | Manual |
| `paused` | `active` | Pause lifted | Manual |
| `active` | `churned` | No activity for N months | Auto (configurable) |
| `churned` | `active` | Re-engagement successful | Manual |
| **any** | `blacklisted` | Policy violation or opt-out | Manual |

### Terminal States
- `blacklisted` — permanent for this brand, requires explicit removal
- `unqualified` — can be reopened manually if criteria change

### Manual Overrides
- Any state → `blacklisted` (immediate)
- Any state → `paused` (temporary hold)
- `blacklisted` → `discovered` (rare, requires approval)

### Side Effects
| Transition | Side Effect |
|------------|-------------|
| → `contacted` | Update `BrandCreator.first_contacted_at` if null |
| → any | Update `BrandCreator.last_contacted_at` |
| → `active` | Update `BrandCreator.last_active_at` |

---

## 2. Outreach Lifecycle

**Entity:** `Outreach`  
**Field:** `status`  
**Purpose:** Track individual outreach messages from draft to response.

**Ownership:** Each Outreach record is owned by EITHER:
- `BrandCreator` (prospecting/general outreach) — via `brand_creator_id`
- `CampaignCreator` (campaign-specific outreach) — via `campaign_creator_id`

Exactly one of these foreign keys must be set.

### States

| State | Description |
|-------|-------------|
| `draft` | Message created but not sent. |
| `scheduled` | Queued for future sending. |
| `sending` | Currently being sent (transient). |
| `sent` | Successfully delivered to channel. |
| `delivered` | Confirmed delivered (email only, if supported). |
| `opened` | Recipient opened message (tracked emails only). |
| `clicked` | Recipient clicked a link (tracked emails only). |
| `replied` | Creator responded (any channel). |
| `bounced` | Delivery failed permanently. |
| `failed` | Send failed (temporary, may retry). |
| `expired` | Scheduled message cancelled or timed out. |

### State Diagram

```
┌───────┐     ┌───────────┐     ┌─────────┐
│ draft │────▶│ scheduled │────▶│ sending │
└───────┘     └───────────┘     └─────────┘
    │                │               │
    │                ▼               ├────────────────┐
    │          ┌─────────┐          ▼                ▼
    │          │ expired │    ┌──────────┐     ┌─────────┐
    │          └─────────┘    │   sent   │     │ failed  │
    │                         └──────────┘     └─────────┘
    │                               │                │
    └───────────────────────────────┤                │
                                    ▼                │
                              ┌───────────┐          │
                              │ delivered │          │
                              └───────────┘          │
                                    │                │
                              ┌─────┴─────┐          │
                              ▼           ▼          ▼
                        ┌──────────┐ ┌─────────┐ ┌─────────┐
                        │  opened  │ │ bounced │ │ (retry) │
                        └──────────┘ └─────────┘ └─────────┘
                              │
                        ┌─────┴─────┐
                        ▼           ▼
                  ┌─────────┐ ┌─────────┐
                  │ clicked │ │ replied │ ◀── [any post-send state]
                  └─────────┘ └─────────┘
                        │
                        ▼
                  ┌─────────┐
                  │ replied │
                  └─────────┘
```

### Transitions

| From | To | Trigger | Auto/Manual |
|------|----|---------|-------------|
| `draft` | `scheduled` | User schedules send | Manual |
| `draft` | `sending` | User sends immediately | Manual |
| `scheduled` | `sending` | Scheduled time reached | Auto |
| `scheduled` | `expired` | User cancels or past deadline | Manual/Auto |
| `sending` | `sent` | API confirms send | Auto |
| `sending` | `failed` | API returns error | Auto |
| `failed` | `sending` | Retry attempted | Auto |
| `failed` | `expired` | Max retries exceeded | Auto |
| `sent` | `delivered` | Delivery confirmation received | Auto |
| `sent` | `bounced` | Bounce notification received | Auto |
| `delivered` | `opened` | Open tracking pixel fired | Auto |
| `opened` | `clicked` | Link click tracked | Auto |
| `sent`/`delivered`/`opened`/`clicked` | `replied` | Reply detected | Manual/Auto |

### Terminal States
- `replied` — success, conversation continues elsewhere
- `bounced` — permanent delivery failure
- `expired` — never sent

### Notes
- `opened` and `clicked` only apply to email with tracking
- DMs go directly `sent` → `replied` (no delivery/open tracking)
- Reply detection may be manual for DM channels

---

## 3. Prospect/Acceptance Lifecycle (Campaign Participation)

**Entity:** `CampaignCreator`  
**Field:** `status`  
**Purpose:** Track a creator's journey from campaign invitation through execution to completion.

**Relationship:** `CampaignCreator` links to `BrandCreator` (not directly to `Creator`). This means:
- A creator must have a `BrandCreator` record before being added to a campaign
- Creating a `CampaignCreator` from a `BrandCreator` in `discovered` state auto-creates the outreach and transitions BrandCreator to `contacted`
- When a creator completes their first campaign, their `BrandCreator.status` transitions to `active`

### States

| State | Description |
|-------|-------------|
| `shortlisted` | Added to campaign consideration list. No outreach yet. |
| `invited` | Campaign invitation sent. |
| `reminded` | Follow-up reminder sent. |
| `negotiating` | Creator responded, discussing terms. |
| `accepted` | Creator agreed to participate. |
| `declined` | Creator rejected invitation. |
| `ghosted` | No response after all attempts. |
| `onboarding` | Accepted, completing onboarding (agreement, address, etc.). |
| `ready` | Fully onboarded, ready for campaign execution. |
| `dropped` | Removed from campaign (brand decision). |
| `withdrawn` | Creator withdrew after accepting. |

### State Diagram

```
┌─────────────┐
│ shortlisted │
└─────────────┘
       │
       ▼
┌─────────────┐     ┌───────────┐     ┌───────────────┐
│   invited   │────▶│ reminded  │────▶│    ghosted    │
└─────────────┘     └───────────┘     └───────────────┘
       │                  │
       ├──────────────────┤
       ▼                  ▼
┌─────────────┐     ┌───────────┐
│ negotiating │     │ declined  │
└─────────────┘     └───────────┘
       │
       ├────────────────────────┐
       ▼                        ▼
┌─────────────┐           ┌───────────┐
│  accepted   │           │ declined  │
└─────────────┘           └───────────┘
       │
       ▼
┌─────────────┐
│ onboarding  │────────────────────┐
└─────────────┘                    │
       │                           ▼
       ▼                     ┌───────────┐
┌─────────────┐              │ withdrawn │
│    ready    │              └───────────┘
└─────────────┘
       │
       ▼
[Content Workflow]

Note: `dropped` can be reached from any state (manual override)
```

### Transitions

| From | To | Trigger | Auto/Manual |
|------|----|---------|-------------|
| `shortlisted` | `invited` | Invitation outreach sent | Auto |
| `invited` | `reminded` | Follow-up sent (after N days) | Auto |
| `invited` | `negotiating` | Creator responds with questions/counter | Manual |
| `invited` | `accepted` | Creator accepts directly | Manual |
| `invited` | `declined` | Creator declines | Manual |
| `reminded` | `negotiating` | Creator responds | Manual |
| `reminded` | `ghosted` | No response after final reminder | Auto |
| `negotiating` | `accepted` | Terms agreed | Manual |
| `negotiating` | `declined` | Negotiation fails | Manual |
| `accepted` | `onboarding` | Begin onboarding process | Auto |
| `onboarding` | `ready` | All onboarding complete (agreement signed, address provided) | Auto |
| `onboarding` | `withdrawn` | Creator backs out | Manual |
| **any** | `dropped` | Brand removes creator | Manual |
| `ghosted` | `invited` | Re-engage attempt | Manual |

### Terminal States
- `declined` — creator said no
- `ghosted` — no response (can be re-engaged)
- `dropped` — brand removed
- `withdrawn` — creator quit after accepting

### Onboarding Completion Criteria
`onboarding` → `ready` requires:
1. Agreement status = `countersigned`
2. Shipping address provided (if product campaign)
3. Brief acknowledged (if required)

---

## 4. Campaign Lifecycle

**Entity:** `Campaign`  
**Field:** `status`  
**Purpose:** Track the overall state of a marketing campaign.

### States

| State | Description |
|-------|-------------|
| `draft` | Campaign being configured. Not visible to team. |
| `review` | Ready for internal review/approval. |
| `approved` | Approved, ready to launch. |
| `recruiting` | Actively finding and inviting creators. |
| `active` | Campaign in progress. Creators are creating/posting. |
| `paused` | Temporarily halted. No new activity. |
| `wrapping` | No new content, collecting final posts and metrics. |
| `completed` | All deliverables received, campaign finished. |
| `cancelled` | Terminated before completion. |
| `archived` | Completed and archived for records. |

### State Diagram

```
┌─────────┐     ┌──────────┐     ┌──────────┐
│  draft  │────▶│  review  │────▶│ approved │
└─────────┘     └──────────┘     └──────────┘
                     │                 │
                     ▼                 ▼
               ┌───────────┐    ┌────────────┐
               │  (back to │    │ recruiting │
               │   draft)  │    └────────────┘
               └───────────┘          │
                                      ▼
                              ┌────────────┐      ┌───────────┐
                              │   active   │◀────▶│  paused   │
                              └────────────┘      └───────────┘
                                    │                   │
                              ┌─────┴─────┐            │
                              ▼           ▼            │
                        ┌──────────┐ ┌───────────┐     │
                        │ wrapping │ │ cancelled │◀────┘
                        └──────────┘ └───────────┘
                              │
                              ▼
                        ┌───────────┐
                        │ completed │
                        └───────────┘
                              │
                              ▼
                        ┌───────────┐
                        │ archived  │
                        └───────────┘
```

### Transitions

| From | To | Trigger | Auto/Manual |
|------|----|---------|-------------|
| `draft` | `review` | User submits for review | Manual |
| `review` | `draft` | Reviewer requests changes | Manual |
| `review` | `approved` | Reviewer approves | Manual |
| `approved` | `recruiting` | Campaign launched | Manual |
| `recruiting` | `active` | First creator reaches `ready` status | Auto |
| `recruiting` | `cancelled` | Campaign cancelled before launch | Manual |
| `active` | `paused` | Brand pauses campaign | Manual |
| `paused` | `active` | Brand resumes campaign | Manual |
| `paused` | `cancelled` | Brand cancels during pause | Manual |
| `active` | `wrapping` | End date reached OR manual trigger | Auto/Manual |
| `active` | `cancelled` | Brand cancels mid-campaign | Manual |
| `wrapping` | `completed` | All content posted and metrics collected | Auto/Manual |
| `completed` | `archived` | Retention period passed or manual archive | Auto/Manual |

### Terminal States
- `completed` → `archived` — success path
- `cancelled` — terminated early

### Auto-Transition Rules
- `recruiting` → `active`: When ≥1 CampaignCreator reaches `ready`
- `active` → `wrapping`: When `end_date` is reached
- `wrapping` → `completed`: When all CampaignCreators are `completed` or `dropped`

---

## 5. Agreement Lifecycle

**Entity:** `Agreement`  
**Field:** `status`  
**Purpose:** Track contract workflow from creation to execution.

### States

| State | Description |
|-------|-------------|
| `draft` | Agreement being prepared. Not sent. |
| `pending_review` | Internal review before sending. |
| `ready` | Approved for sending. |
| `sent` | Sent to creator for signature. |
| `viewed` | Creator opened the agreement. |
| `signed` | Creator signed. Awaiting countersignature. |
| `countersigned` | Brand countersigned. Fully executed. |
| `active` | Agreement is in effect (within date range). |
| `expired` | Not signed within deadline OR end date passed. |
| `terminated` | Ended early by either party. |
| `superseded` | Replaced by a newer agreement. |

### State Diagram

```
┌─────────┐     ┌────────────────┐     ┌─────────┐
│  draft  │────▶│ pending_review │────▶│  ready  │
└─────────┘     └────────────────┘     └─────────┘
                       │                    │
                       ▼                    ▼
                 ┌───────────┐         ┌─────────┐
                 │ (back to  │         │   sent  │
                 │   draft)  │         └─────────┘
                 └───────────┘              │
                                     ┌─────┴─────┐
                                     ▼           ▼
                               ┌──────────┐ ┌─────────┐
                               │  viewed  │ │ expired │
                               └──────────┘ └─────────┘
                                     │
                                     ▼
                               ┌──────────┐
                               │  signed  │
                               └──────────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │countersigned │
                              └──────────────┘
                                     │
                                     ▼
                               ┌──────────┐
                               │  active  │
                               └──────────┘
                                     │
                        ┌────────────┼────────────┐
                        ▼            ▼            ▼
                  ┌─────────┐ ┌────────────┐ ┌────────────┐
                  │ expired │ │ terminated │ │ superseded │
                  └─────────┘ └────────────┘ └────────────┘
```

### Transitions

| From | To | Trigger | Auto/Manual |
|------|----|---------|-------------|
| `draft` | `pending_review` | User submits for review | Manual |
| `pending_review` | `draft` | Reviewer requests changes | Manual |
| `pending_review` | `ready` | Reviewer approves | Manual |
| `draft` | `ready` | Skip review (if allowed) | Manual |
| `ready` | `sent` | Agreement sent to creator | Auto |
| `sent` | `viewed` | Creator opens agreement link | Auto |
| `sent` | `expired` | Signing deadline passed | Auto |
| `viewed` | `signed` | Creator signs | Auto |
| `viewed` | `expired` | Signing deadline passed | Auto |
| `signed` | `countersigned` | Brand countersigns | Manual/Auto |
| `countersigned` | `active` | Agreement start date reached | Auto |
| `active` | `expired` | Agreement end date passed | Auto |
| `active` | `terminated` | Either party terminates | Manual |
| `active` | `superseded` | New agreement created | Auto |

### Terminal States
- `countersigned`/`active` → `expired` — natural end
- `terminated` — early end
- `superseded` — replaced
- `expired` (from `sent`/`viewed`) — never signed

### Notes
- `countersigned` vs `active`: Some workflows don't need date-based activation
- Auto-countersign option for brands that pre-approve

---

## 6. Shipment Lifecycle

**Entity:** `Shipment`  
**Field:** `status`  
**Purpose:** Track product shipments from creation to delivery.

### States

| State | Description |
|-------|-------------|
| `pending` | Shipment created, not yet prepared. |
| `preparing` | Items being picked/packed. |
| `on_hold` | Waiting on something (address, stock, etc.). |
| `label_created` | Shipping label generated. |
| `shipped` | Handed to carrier. |
| `in_transit` | Carrier has package, in transport. |
| `out_for_delivery` | On delivery vehicle. |
| `delivered` | Confirmed delivered. |
| `failed_attempt` | Delivery attempted but failed. |
| `exception` | Carrier exception (weather, address issue, etc.). |
| `returned` | Returned to sender. |
| `lost` | Package lost in transit. |
| `cancelled` | Shipment cancelled before shipping. |

### State Diagram

```
┌─────────┐     ┌───────────┐     ┌───────────────┐
│ pending │────▶│ preparing │────▶│ label_created │
└─────────┘     └───────────┘     └───────────────┘
     │               │                   │
     ▼               ▼                   ▼
┌─────────┐    ┌───────────┐       ┌───────────┐
│ on_hold │    │ cancelled │       │  shipped  │
└─────────┘    └───────────┘       └───────────┘
     │                                   │
     └──────────────────┐                ▼
                        │          ┌────────────┐
                        └─────────▶│ in_transit │
                                   └────────────┘
                                         │
                              ┌──────────┼──────────┐
                              ▼          ▼          ▼
                        ┌───────────┐ ┌─────────┐ ┌───────────┐
                        │out_for_   │ │exception│ │   lost    │
                        │delivery   │ └─────────┘ └───────────┘
                        └───────────┘      │
                              │            │
                        ┌─────┴────────────┤
                        ▼                  ▼
                  ┌───────────┐     ┌──────────────┐
                  │ delivered │     │failed_attempt│
                  └───────────┘     └──────────────┘
                                          │
                                    ┌─────┴─────┐
                                    ▼           ▼
                              ┌──────────┐ ┌──────────┐
                              │ returned │ │delivered │
                              └──────────┘ └──────────┘
```

### Transitions

| From | To | Trigger | Auto/Manual |
|------|----|---------|-------------|
| `pending` | `preparing` | Fulfillment started | Manual |
| `pending` | `on_hold` | Missing info or stock | Manual |
| `pending` | `cancelled` | Shipment cancelled | Manual |
| `on_hold` | `preparing` | Hold resolved | Manual |
| `on_hold` | `cancelled` | Shipment cancelled | Manual |
| `preparing` | `label_created` | Label generated | Auto |
| `preparing` | `cancelled` | Shipment cancelled | Manual |
| `label_created` | `shipped` | Carrier pickup/scan | Auto |
| `shipped` | `in_transit` | First transit scan | Auto |
| `in_transit` | `out_for_delivery` | Out for delivery scan | Auto |
| `in_transit` | `exception` | Carrier exception event | Auto |
| `in_transit` | `lost` | Declared lost | Manual |
| `out_for_delivery` | `delivered` | Delivery confirmation | Auto |
| `out_for_delivery` | `failed_attempt` | Failed delivery scan | Auto |
| `exception` | `in_transit` | Exception resolved | Auto |
| `exception` | `returned` | Return initiated | Auto |
| `failed_attempt` | `out_for_delivery` | Re-attempt | Auto |
| `failed_attempt` | `returned` | Max attempts exceeded | Auto |

### Terminal States
- `delivered` — success
- `returned` — back to sender
- `lost` — unrecoverable
- `cancelled` — never shipped

### Webhook Integration
Most transitions after `shipped` come from carrier webhooks:
- Integrate with EasyPost, Shippo, or direct carrier APIs
- Map carrier status codes to internal states

---

## 7. Content Lifecycle

**Entity:** `Content`  
**Field:** `status`  
**Purpose:** Track content from assignment through approval.

### States

| State | Description |
|-------|-------------|
| `pending` | Content assigned but not started. |
| `in_progress` | Creator actively working on content. |
| `submitted` | Creator submitted for review. |
| `in_review` | Brand team reviewing content. |
| `revision_requested` | Changes requested from creator. |
| `approved` | Content approved, ready to post. |
| `rejected` | Content rejected, will not be used. |
| `cancelled` | Content assignment cancelled. |

### State Diagram

```
┌─────────┐     ┌─────────────┐
│ pending │────▶│ in_progress │◀───────────────────┐
└─────────┘     └─────────────┘                    │
     │                │                            │
     ▼                ▼                            │
┌───────────┐   ┌───────────┐     ┌───────────────────────┐
│ cancelled │   │ submitted │────▶│      in_review        │
└───────────┘   └───────────┘     └───────────────────────┘
                                         │
                              ┌──────────┼──────────┐
                              ▼          ▼          ▼
                        ┌──────────┐┌─────────┐┌──────────────────┐
                        │ approved ││rejected ││revision_requested│
                        └──────────┘└─────────┘└──────────────────┘
                                                       │
                                                       ▼
                                               ┌─────────────┐
                                               │ in_progress │
                                               └─────────────┘
```

### Transitions

| From | To | Trigger | Auto/Manual |
|------|----|---------|-------------|
| `pending` | `in_progress` | Creator starts working | Manual (creator) |
| `pending` | `cancelled` | Assignment cancelled | Manual |
| `in_progress` | `submitted` | Creator uploads and submits | Manual (creator) |
| `in_progress` | `cancelled` | Assignment cancelled | Manual |
| `submitted` | `in_review` | Reviewer picks up | Auto/Manual |
| `in_review` | `approved` | Reviewer approves | Manual |
| `in_review` | `rejected` | Reviewer rejects | Manual |
| `in_review` | `revision_requested` | Reviewer requests changes | Manual |
| `revision_requested` | `in_progress` | Creator acknowledges and resumes | Manual (creator) |
| `revision_requested` | `cancelled` | Too many revisions or creator withdraws | Manual |

### Terminal States
- `approved` — moves to Posting workflow
- `rejected` — content won't be used
- `cancelled` — assignment dropped

### Revision Limits
- Track `revision_count` on Content entity
- Consider auto-escalation after N revisions

---

## 8. Posting & Performance Lifecycle

**Entity:** `Content` (continues from Content Lifecycle)  
**Field:** `status` (extended states)  
**Purpose:** Track content from approval through posting and performance tracking.

### States (Post-Approval)

| State | Description |
|-------|-------------|
| `approved` | (from Content Lifecycle) Ready to post. |
| `scheduled` | Post scheduled for future time. |
| `posting` | Post being published (transient). |
| `posted` | Successfully published. Live on platform. |
| `live` | Confirmed live, actively tracking metrics. |
| `underperforming` | Metrics below expectations (flagged). |
| `completed` | Tracking period ended, final metrics captured. |
| `removed` | Content taken down (creator or platform). |
| `failed` | Posting failed. |

### State Diagram

```
┌──────────┐     ┌───────────┐     ┌─────────┐
│ approved │────▶│ scheduled │────▶│ posting │
└──────────┘     └───────────┘     └─────────┘
     │                                  │
     └────────────────────────┐         │
                              ▼         ▼
                         ┌─────────┐┌────────┐
                         │ posting ││ failed │
                         └─────────┘└────────┘
                              │         │
                              ▼         │
                         ┌─────────┐    │
                         │ posted  │◀───┘ (retry)
                         └─────────┘
                              │
                              ▼
                         ┌─────────┐
                         │  live   │
                         └─────────┘
                              │
                   ┌──────────┼──────────┐
                   ▼          ▼          ▼
            ┌───────────┐┌───────────┐┌─────────┐
            │underper-  ││ completed ││ removed │
            │forming    │└───────────┘└─────────┘
            └───────────┘
                   │
                   ▼
            ┌───────────┐
            │ completed │
            └───────────┘
```

### Transitions

| From | To | Trigger | Auto/Manual |
|------|----|---------|-------------|
| `approved` | `scheduled` | Creator/brand schedules post | Manual |
| `approved` | `posting` | Immediate post triggered | Manual |
| `scheduled` | `posting` | Scheduled time reached | Auto |
| `posting` | `posted` | Post confirmed live | Auto |
| `posting` | `failed` | Posting error | Auto |
| `failed` | `posting` | Retry | Manual |
| `posted` | `live` | Post URL verified and metrics tracking started | Auto |
| `live` | `underperforming` | Metrics below threshold at checkpoint | Auto |
| `live` | `completed` | Tracking period ended | Auto |
| `underperforming` | `completed` | Tracking period ended | Auto |
| `live` | `removed` | Content no longer accessible | Auto/Manual |
| `underperforming` | `removed` | Content no longer accessible | Auto/Manual |

### Terminal States
- `completed` — success, metrics finalized
- `removed` — content taken down
- `failed` — couldn't post (after retries exhausted)

### Performance Thresholds
Configure per-campaign or per-brand:
- Views threshold (e.g., < 50% of creator average)
- Engagement threshold
- Checkpoint timing (24h, 48h, 7d)

### Metrics Collection Schedule
```
posted + 1h   → initial metrics
posted + 24h  → day 1 metrics
posted + 48h  → day 2 metrics  
posted + 7d   → week 1 metrics (→ completed for stories)
posted + 30d  → month 1 metrics (→ completed for posts)
```

---

## State Machine Implementation Notes

### 1. State Transition Table Pattern

```
transitions = {
  'discovered': ['researching', 'contacted', 'blacklisted'],
  'researching': ['qualified', 'unqualified', 'blacklisted'],
  ...
}

def can_transition(current, target):
    return target in transitions.get(current, [])

def transition(entity, target, trigger=None):
    if not can_transition(entity.status, target):
        raise InvalidTransitionError
    entity.status = target
    entity.updated_at = now()
    log_transition(entity, target, trigger)
```

### 2. Required Fields per Transition

| Entity | Transition | Required Fields |
|--------|------------|-----------------|
| Agreement | → `sent` | `document_url`, `creator.email` |
| Shipment | → `shipped` | `tracking_number`, `carrier` |
| Content | → `submitted` | `file_urls` (non-empty) |
| Content | → `posted` | `post_url` |

### 3. Side Effects

| Entity | Transition | Side Effect |
|--------|------------|-------------|
| Outreach (BrandCreator) | → `sent` | Update BrandCreator.status → `contacted`, set `first_contacted_at` |
| Outreach (CampaignCreator) | → `sent` | Update CampaignCreator.status → `invited` |
| Outreach | → `replied` | Update parent (BrandCreator or CampaignCreator) status |
| CampaignCreator | → `shortlisted` | Create BrandCreator if not exists (status = `discovered`) |
| CampaignCreator | → `invited` | Update BrandCreator.status → `contacted` (if not already past) |
| CampaignCreator | → `ready` | Check if Campaign should → `active` |
| CampaignCreator | → `completed` | Update BrandCreator.status → `active`, set `last_active_at` |
| Agreement | → `countersigned` | Update CampaignCreator → `ready` (if other criteria met) |
| Content | → `approved` | Check if all content approved → trigger payment |
| Content | → `posted` | Start metrics collection job |
| Shipment | → `delivered` | Update CampaignCreator → `creating` |

### 4. Audit Trail

Every state transition should log:
- `entity_type`, `entity_id`
- `from_status`, `to_status`
- `trigger` (event/action that caused it)
- `user_id` (if manual)
- `timestamp`
- `metadata` (any additional context)

---

## Cross-Workflow Dependencies

### Brand Layer → Campaign Layer

| When... | Then... |
|---------|---------|
| CampaignCreator created for BrandCreator | BrandCreator.status stays as-is (or → `contacted` on invite) |
| CampaignCreator → `completed` (first time) | BrandCreator → `active` |
| All CampaignCreators for a BrandCreator = `completed`/`dropped` | Update BrandCreator.last_active_at |

### Campaign Layer Internal

| When... | Then... |
|---------|---------|
| First CampaignCreator → `ready` | Campaign → `active` (if `recruiting`) |
| All CampaignCreator content = `posted` | CampaignCreator → `completed` |
| All CampaignCreators = `completed` or `dropped` | Campaign → `wrapping` (if not already) |
| Agreement = `countersigned` AND Address exists | CampaignCreator → `ready` |
| Shipment = `delivered` | CampaignCreator → `creating` |
| Content = `approved` (all required) | Create Payment record |
| Campaign = `cancelled` | All CampaignCreators → `dropped`, all Content → `cancelled` |

### Cascade Rules

| When... | Then... |
|---------|---------|
| BrandCreator → `blacklisted` | All active CampaignCreators → `dropped` |
| Campaign → `cancelled` | All CampaignCreators → `dropped`, Shipments → `cancelled`, Content → `cancelled` |
| CampaignCreator → `dropped`/`withdrawn` | Related Shipments → `cancelled` (if not shipped), Content → `cancelled` |

---

## Tech Stack

### 2024-03-24: Tech Stack v1

**Status:** Approved  
**Context:** Choose a practical stack for building Creator Campaign OS as a real SaaS product. Must support: auth with team workspaces, complex relational data, workflow state machines, file uploads, document generation, background jobs, notifications, third-party integrations, reporting, and future AI features.

**Philosophy:** Ship fast, stay simple, avoid over-engineering. Choose boring technology where it matters, modern tooling where it helps velocity.

---

## Stack Summary

| Layer | Choice | Why |
|-------|--------|-----|
| **Frontend** | Next.js 14+ (App Router) | Best React framework, huge ecosystem, great for dashboards |
| **UI Components** | shadcn/ui + Tailwind CSS | Copy-paste components, full control, accessible |
| **Backend** | Next.js Server Actions + API Routes | Monolith for MVP, can extract later |
| **Database** | PostgreSQL (via Neon) | Best for relational data, rock solid |
| **ORM** | Drizzle ORM | Fast, type-safe, SQL-like, great migrations |
| **Auth** | Clerk | Built-in team/org support, SSO, fast integration |
| **File Storage** | Cloudflare R2 | S3-compatible, no egress fees, cheap |
| **Background Jobs** | Inngest | Perfect for workflows, event-driven, great DX |
| **Document Generation** | React-PDF + DocuSign | Briefs via React-PDF, agreements via DocuSign |
| **Email** | Resend + React Email | Modern API, type-safe templates |
| **Hosting** | Vercel | Zero-config Next.js, preview deploys, good observability |
| **Error Tracking** | Sentry | Industry standard, good Next.js integration |
| **Analytics** | PostHog | Product analytics, session replay, feature flags |
| **AI** | Vercel AI SDK | Provider-agnostic, streaming, great Next.js integration |

---

## Detailed Decisions

### 1. Frontend: Next.js 14+ (App Router)

**Choice:** Next.js with App Router, React Server Components

**Why:**
- Industry standard for React applications
- Server Components reduce client JS, great for data-heavy dashboards
- Built-in routing, layouts, loading states
- Excellent TypeScript support
- Largest talent pool for hiring
- Vercel deployment is trivial
- Great ecosystem (auth, analytics, etc. all have Next.js integrations)

**Tradeoffs:**
- App Router still has some edge cases
- Vendor lock-in with Vercel (mitigated: can self-host)
- Bundle size can creep up if not careful

**Rejected Alternatives:**
| Alternative | Why Rejected |
|-------------|--------------|
| Remix | Smaller ecosystem, less mature for complex apps |
| SvelteKit | Smaller talent pool, fewer integrations |
| React + Vite SPA | Need SSR for SEO, more setup work |
| Vue/Nuxt | Team preference for React ecosystem |

---

### 2. UI: shadcn/ui + Tailwind CSS

**Choice:** shadcn/ui component library with Tailwind CSS

**Why:**
- Copy-paste components = full control, no dependency updates breaking things
- Built on Radix primitives = accessible by default
- Tailwind = consistent styling, fast iteration
- Great component coverage: tables, forms, dialogs, dropdowns, etc.
- Active community, new components regularly
- Works perfectly with React Server Components

**Tradeoffs:**
- Need to maintain copied components (minor)
- Tailwind can get verbose (worth it for speed)

**Rejected Alternatives:**
| Alternative | Why Rejected |
|-------------|--------------|
| Material UI | Heavy, opinionated styling, harder to customize |
| Chakra UI | Performance issues, less flexible |
| Tailwind UI | Paid, less component variety |
| Ant Design | Enterprise feel, heavy bundle |

---

### 3. Backend: Next.js Monolith

**Choice:** Use Next.js Server Actions + API Routes as the backend

**Why:**
- One codebase = simpler deployment, shared types
- Server Actions for mutations = less boilerplate than API routes
- API Routes for webhooks, integrations, public API
- Can always extract to separate backend later if needed
- Good enough for MVP and beyond

**Architecture:**
```
/app
  /api           → API routes (webhooks, integrations)
  /(app)         → Authenticated app routes (dashboard, campaigns, etc.)
  /(marketing)   → Public marketing pages
/lib
  /db            → Drizzle schema, queries
  /actions       → Server actions
  /services      → Business logic
  /workflows     → Inngest workflow definitions
```

**Tradeoffs:**
- Mixing frontend/backend can get messy at scale
- Serverless cold starts (mitigated with Vercel's edge functions where appropriate)
- Less separation of concerns than separate backend

**Rejected Alternatives:**
| Alternative | Why Rejected |
|-------------|--------------|
| Separate Node.js backend | More complexity, separate deployment, not needed for MVP |
| tRPC | Extra layer of abstraction, Server Actions are simpler |
| Rails/Django | Different language, lose TypeScript end-to-end types |
| Go | Faster runtime but slower development, no type sharing |

**Future Path:** If backend needs to scale independently or needs different runtime characteristics, extract to separate Node.js service. The Drizzle schema and business logic in `/lib` will be portable.

---

### 4. Database: PostgreSQL (Neon)

**Choice:** PostgreSQL hosted on Neon

**Why:**
- Best relational database for complex data with many joins
- JSONB for flexible fields (deliverables, metadata)
- Excellent ecosystem (extensions, tooling)
- Neon specifically:
  - Serverless Postgres (scales to zero, instant branching)
  - Great free tier for development
  - Database branching for preview deployments
  - Generous pricing at scale

**Tradeoffs:**
- Need to manage schema migrations (Drizzle handles this)
- Serverless Postgres has cold starts (Neon is fast, <100ms)

**Rejected Alternatives:**
| Alternative | Why Rejected |
|-------------|--------------|
| Supabase | Good but heavier (includes auth, storage, etc. we don't need) |
| PlanetScale | MySQL, less feature-rich than Postgres |
| Vercel Postgres | Expensive for what you get |
| CockroachDB | Overkill for MVP |
| MongoDB | Wrong choice for highly relational data |

---

### 5. ORM: Drizzle ORM

**Choice:** Drizzle ORM with drizzle-kit for migrations

**Why:**
- Type-safe, SQL-like syntax (not hiding SQL, embracing it)
- Fast runtime (no heavy query engine like Prisma)
- Great migration story with drizzle-kit
- Works perfectly with serverless (no connection pooling issues)
- Active development, growing ecosystem

**Example:**
```typescript
// Schema definition
export const creators = pgTable('creators', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique(),
  name: varchar('name', { length: 255 }).notNull(),
  tier: creatorTierEnum('tier'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Query
const activeCreators = await db
  .select()
  .from(brandCreators)
  .where(eq(brandCreators.status, 'active'))
  .innerJoin(creators, eq(brandCreators.creatorId, creators.id));
```

**Tradeoffs:**
- Newer than Prisma (less Stack Overflow answers)
- Slightly more verbose than Prisma for simple queries

**Rejected Alternatives:**
| Alternative | Why Rejected |
|-------------|--------------|
| Prisma | Slower runtime, connection pooling complexity, heavy client |
| TypeORM | Older, more bugs, worse TypeScript support |
| Kysely | Query builder only, no migrations |
| Raw SQL | No type safety, error-prone |

---

### 6. Auth: Clerk

**Choice:** Clerk for authentication and team management

**Why:**
- Built-in Organizations feature = team workspaces out of the box
- Handles: sign-up, sign-in, MFA, SSO, invites, roles
- Beautiful pre-built components
- Excellent Next.js integration
- Reasonable pricing ($0 to 10k MAU on Pro)
- Reduces weeks of auth work to hours

**Features We Get:**
- User authentication (email, Google, etc.)
- Organization/team management
- Role-based access control
- Invite flows
- User profile management
- Session management
- Webhooks for user events

**Tradeoffs:**
- Paid service (but worth the time saved)
- Vendor lock-in (can migrate to self-hosted later)
- Less control than custom auth

**Rejected Alternatives:**
| Alternative | Why Rejected |
|-------------|--------------|
| Auth.js (NextAuth) | No built-in team/org support, significant custom work |
| Supabase Auth | Would need to build org logic, less polished |
| Lucia | Good for simple auth, no org support |
| Custom | 4-6 weeks of work for what Clerk does in hours |

---

### 7. File Storage: Cloudflare R2

**Choice:** Cloudflare R2 for file storage

**Why:**
- S3-compatible API (easy to use existing tools/libraries)
- **Zero egress fees** (huge for media-heavy app)
- Significantly cheaper than S3
- Global CDN built-in
- Good developer experience

**Use Cases:**
- Creator avatars
- Content uploads (images, videos for review)
- Generated documents (briefs, agreements)
- Brand assets (logos, product images)

**Tradeoffs:**
- Slightly less mature than S3
- Fewer regions than S3 (rarely matters with CDN)

**Rejected Alternatives:**
| Alternative | Why Rejected |
|-------------|--------------|
| AWS S3 | Expensive egress fees |
| Supabase Storage | Tied to Supabase ecosystem |
| UploadThing | Good DX but more expensive at scale |
| Vercel Blob | Expensive, limited features |

---

### 8. Background Jobs: Inngest

**Choice:** Inngest for background jobs and workflow orchestration

**Why:**
- **Perfect for state machine workflows** (our core complexity)
- Event-driven architecture matches our workflow model
- Built-in: retries, scheduling, rate limiting, observability
- Step functions for multi-step workflows
- Works great with serverless (Vercel)
- Generous free tier (25k runs/month)
- Great local development experience

**Example workflow:**
```typescript
export const campaignCreatorOnboarding = inngest.createFunction(
  { id: 'campaign-creator-onboarding' },
  { event: 'campaign-creator/accepted' },
  async ({ event, step }) => {
    // Step 1: Create agreement
    const agreement = await step.run('create-agreement', async () => {
      return createAgreement(event.data.campaignCreatorId);
    });

    // Step 2: Send agreement
    await step.run('send-agreement', async () => {
      return sendAgreementEmail(agreement.id);
    });

    // Step 3: Wait for signature (with timeout)
    const signed = await step.waitForEvent('agreement/signed', {
      timeout: '7d',
      match: 'data.agreementId',
    });

    if (!signed) {
      await step.run('send-reminder', async () => {
        return sendSignatureReminder(agreement.id);
      });
    }
  }
);
```

**Tradeoffs:**
- External service (can self-host if needed)
- Learning curve for event-driven patterns

**Rejected Alternatives:**
| Alternative | Why Rejected |
|-------------|--------------|
| BullMQ | Requires Redis, self-hosted, no step functions |
| Trigger.dev | Similar to Inngest but less mature |
| Temporal | Overkill for MVP, complex setup |
| Vercel Cron | Too simple, no workflows |
| AWS Step Functions | Complex, AWS lock-in |

---

### 9. Document Generation

**Choice:** 
- **Briefs/Reports:** React-PDF
- **Agreements:** DocuSign API

**Why React-PDF for briefs:**
- React components = familiar syntax
- Reuse design system components conceptually
- Good for structured documents (briefs, reports)
- Runs server-side

**Why DocuSign for agreements:**
- E-signature legally required for contracts
- Industry standard, trusted by creators
- Template management
- Audit trail built-in
- Webhooks for signature status

**Example React-PDF:**
```typescript
const BriefDocument = ({ campaign, deliverables }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>{campaign.name}</Text>
      <Text style={styles.section}>Deliverables</Text>
      {deliverables.map(d => (
        <Text key={d.id}>• {d.description}</Text>
      ))}
    </Page>
  </Document>
);
```

**Tradeoffs:**
- DocuSign is paid (per envelope), but necessary for legal validity
- React-PDF has learning curve for complex layouts

**Rejected Alternatives:**
| Alternative | Why Rejected |
|-------------|--------------|
| Puppeteer/Playwright | Heavy runtime, slower, harder to maintain |
| PDFKit | Lower-level, more code |
| PandaDoc | Similar to DocuSign, less market share |
| HelloSign | Acquired by Dropbox, less focused |

---

### 10. Email: Resend + React Email

**Choice:** Resend for delivery, React Email for templates

**Why:**
- Modern API design (better than SendGrid/Mailgun DX)
- React Email = type-safe, component-based templates
- Excellent deliverability
- Good pricing (3k emails/month free, then $20/month)
- Great Next.js integration

**Example:**
```typescript
// Template
const OutreachEmail = ({ creatorName, brandName, campaignName }) => (
  <Html>
    <Body>
      <Heading>Hi {creatorName}!</Heading>
      <Text>
        {brandName} would love to work with you on {campaignName}.
      </Text>
      <Button href="...">View Campaign</Button>
    </Body>
  </Html>
);

// Send
await resend.emails.send({
  from: 'campaigns@app.com',
  to: creator.email,
  subject: `${brand.name} wants to collaborate!`,
  react: OutreachEmail({ creatorName, brandName, campaignName }),
});
```

**Tradeoffs:**
- Newer service (but backed by YC, growing fast)
- Less email analytics than SendGrid

**Rejected Alternatives:**
| Alternative | Why Rejected |
|-------------|--------------|
| SendGrid | Clunky API, template system is painful |
| AWS SES | Raw, need to build everything |
| Postmark | Good but more expensive, no React templates |
| Mailgun | Similar to SendGrid issues |

---

### 11. Hosting: Vercel

**Choice:** Vercel for application hosting

**Why:**
- Zero-config Next.js deployment
- Preview deployments for every PR
- Edge functions for low-latency operations
- Built-in analytics and monitoring
- Great DX (git push = deploy)
- Reasonable pricing for startups

**Architecture:**
```
Vercel (App)
    ├── Edge: Middleware (auth, redirects)
    ├── Serverless: API routes, Server Actions
    └── Static: Marketing pages, assets

Neon (Database) ──── Direct connection
R2 (Files) ──────── Via presigned URLs
Inngest (Jobs) ──── Via webhooks
```

**Tradeoffs:**
- Can get expensive at scale (mitigate with edge caching)
- Serverless cold starts (usually fine)
- Some vendor lock-in (can migrate to Docker/self-host)

**Rejected Alternatives:**
| Alternative | Why Rejected |
|-------------|--------------|
| Railway | Good but more setup for Next.js |
| Fly.io | Better for long-running processes, overkill for MVP |
| AWS (ECS/Lambda) | Complex, slow iteration |
| Self-hosted | Ops overhead not worth it for MVP |

---

### 12. Observability: Sentry + PostHog

**Choice:** 
- **Error tracking:** Sentry
- **Product analytics:** PostHog

**Why Sentry:**
- Industry standard for error tracking
- Excellent Next.js integration
- Source maps, breadcrumbs, user context
- Good free tier

**Why PostHog:**
- Self-hostable (data privacy)
- Product analytics + session replay + feature flags
- Generous free tier (1M events/month)
- No sampling like other tools

**Tradeoffs:**
- Two tools instead of one (worth it for specialization)
- PostHog self-hosting is optional but recommended for privacy

**Rejected Alternatives:**
| Alternative | Why Rejected |
|-------------|--------------|
| Datadog | Expensive, overkill for MVP |
| LogRocket | Expensive at scale |
| Amplitude | Analytics only, expensive |
| Mixpanel | Less feature-rich than PostHog |

---

### 13. Admin Tooling

**Choice:** Build admin views into the app with role-based access

**Why:**
- Full control over UX
- Uses same component library (shadcn/ui)
- No additional service costs
- Admin-specific views are just protected routes

**Approach:**
- Admin role in Clerk organizations
- Admin-only routes under `/admin`
- Use shadcn/ui data tables for entity management
- Build specific tools as needed (creator merge, campaign clone, etc.)

**Future:** If ops team needs more power, add Retool for internal tools.

**Rejected Alternatives:**
| Alternative | Why Rejected |
|-------------|--------------|
| Retool | Expensive, overkill for MVP |
| AdminJS | Clunky, limited customization |
| Forest Admin | Paid, limited |

---

### 14. AI Integration: Vercel AI SDK

**Choice:** Vercel AI SDK with OpenAI/Anthropic

**Why:**
- Provider-agnostic (can switch between OpenAI, Anthropic, etc.)
- Streaming built-in
- Perfect Next.js integration
- Structured output support
- Good primitives for chat, completion, embeddings

**Use Cases (Future):**
- Brief generation from campaign goals
- Outreach message personalization
- Content caption suggestions
- Performance insight summaries
- Creator matching recommendations

**Example:**
```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const { text } = await generateText({
  model: anthropic('claude-3-sonnet-20240229'),
  prompt: `Write a campaign brief for ${campaign.name}...`,
});
```

**Tradeoffs:**
- AI costs can add up (mitigate with caching, rate limits)
- Need to design good prompts

---

### 15. Third-Party Integrations

**Approach:** Build integrations as needed, prioritize based on user demand.

**Priority 1 (MVP):**
- **Shopify:** Product catalog sync, order webhooks for affiliate tracking
- **Social APIs:** Instagram/TikTok for creator verification, metrics

**Priority 2 (Post-MVP):**
- **Shipping:** ShipStation or EasyPost for label generation
- **Payments:** Stripe Connect for creator payouts
- **Calendar:** Google Calendar for campaign milestones

**Integration Pattern:**
```
/lib/integrations
  /shopify
    client.ts      → API client
    sync.ts        → Sync logic
    webhooks.ts    → Webhook handlers
  /instagram
    ...
```

---

## Package Summary

```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "@clerk/nextjs": "^4.x",
    "drizzle-orm": "^0.29.x",
    "@neondatabase/serverless": "^0.7.x",
    "inngest": "^3.x",
    "@react-pdf/renderer": "^3.x",
    "resend": "^2.x",
    "@react-email/components": "^0.x",
    "@sentry/nextjs": "^7.x",
    "posthog-js": "^1.x",
    "ai": "^3.x",
    "@ai-sdk/openai": "^0.x",
    "@aws-sdk/client-s3": "^3.x",
    "tailwindcss": "^3.x",
    "zod": "^3.x"
  }
}
```

---

## Build Order Recommendation

Once scaffolding starts, build in this order:

### Phase 1: Foundation (Week 1)
1. Next.js project setup with TypeScript
2. Drizzle schema for core entities (Creator, Brand, User)
3. Clerk authentication integration
4. Basic layout with shadcn/ui

### Phase 2: Core CRUD (Week 2)
1. Creator management (list, create, view)
2. Campaign management
3. BrandCreator relationship
4. Basic tagging

### Phase 3: Workflows (Week 3-4)
1. Inngest setup
2. CampaignCreator lifecycle (invite → onboarding → ready)
3. Outreach tracking
4. Status transitions with side effects

### Phase 4: Execution (Week 5-6)
1. Agreement generation and tracking
2. Content submission and review
3. File uploads to R2
4. Email notifications

### Phase 5: Polish (Week 7-8)
1. Dashboard and reporting
2. Search and filtering
3. Bulk operations
4. Performance optimization

---

*Last updated: 2024-03-24*
