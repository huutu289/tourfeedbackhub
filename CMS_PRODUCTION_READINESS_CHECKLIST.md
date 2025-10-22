# CMS Production Readiness Assessment

**Date**: 2025-10-20
**Status**: 🟡 Needs Improvements (75% Ready)

---

## Executive Summary

Hệ thống CMS đã có **85% tính năng cơ bản** và **75% production-ready**. Cần hoàn thiện thêm về bảo mật, SEO nâng cao, và monitoring trước khi rollout rộng.

### Priority Matrix
- 🔴 **Critical** (Must fix before production)
- 🟡 **Important** (Should fix soon)
- 🟢 **Nice to have** (Can improve later)

---

## 1) Bảo mật & Quyền hạn

### Current Status: 🟡 65% Complete

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Preview tokenized | ❌ | 🔴 | Currently uses `?preview=true&id=...` without token |
| RBAC rõ ràng | ⚠️ | 🔴 | Basic admin check exists, needs editor/author roles |
| Audit Log | ❌ | 🟡 | No audit_logs collection |
| Firestore Rules protection | ⚠️ | 🔴 | Post updates not fully protected |
| App Check enforce | ✅ | ✅ | Enabled in console |

#### 🔴 Critical Issues:

1. **Preview không có token**: Bất kỳ ai biết post ID đều có thể xem draft
   - Current: `/blog/slug?preview=true&id=abc123`
   - Should: `/blog/slug?preview=true&token=short-lived-jwt`

2. **Firestore Rules thiếu field validation**:
   ```javascript
   // posts/{postId} - Line 103-104
   // ❌ Cho phép client update status, scheduledAt trực tiếp
   allow update, delete: if canWriteAdmin() ||
     (request.auth != null && resource.data.authorId == request.auth.uid);
   ```

3. **Versions subcollection không được bảo vệ**:
   - Line 106-111 cho phép author tự tạo/xóa versions
   - Should: Chỉ Cloud Function được write

#### 🟡 Important Improvements:

1. **Role-based permissions**:
   - Cần phân biệt: admin, editor, author, contributor
   - Editor: publish any post
   - Author: chỉ edit/publish bài của mình
   - Contributor: chỉ submit draft

2. **Audit logging**: Thiếu collection `audit_logs` để track:
   - Who published/restored/deleted
   - When and from what IP
   - What changed (before/after snapshot)

---

## 2) Lịch xuất bản & múi giờ

### Current Status: 🟡 70% Complete

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Scheduler running | ⚠️ | 🔴 | v1 function, runs every 1 hour (too slow) |
| UTC strategy | ✅ | ✅ | Firestore uses UTC Timestamp |
| Idempotent publish | ✅ | ✅ | Batch update with `<=` check |
| Display local timezone | ❌ | 🟡 | Post editor shows UTC, should show local |
| Test timezone edge cases | ❌ | 🟡 | Needs QA |

#### 🔴 Critical Issues:

1. **Scheduler chạy mỗi giờ**:
   ```typescript
   // scheduled-publishing.ts:12
   .schedule('every 1 hours')  // ❌ Too slow for precise scheduling
   ```
   - Should: `every 5 minutes` hoặc `every 1 minutes`
   - Alternative: Migrate to v2 function với Pub/Sub trigger

2. **Không có scheduled job monitoring**:
   - Nếu function fail, không có alert
   - Không track số posts được publish

#### 🟡 Important Improvements:

1. **Timezone display**:
   - Input `datetime-local` hiển thị theo browser timezone
   - Cần chuyển đổi và hiển thị rõ "VN time" vs "UTC"

2. **Preview scheduled posts**:
   - User cần xem post sẽ hiển thị như thế nào vào thời điểm scheduled

---

## 3) SEO & Cấu trúc dữ liệu

### Current Status: 🟡 60% Complete

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Canonical URL | ⚠️ | 🔴 | In types but not enforced |
| hreflang tags | ❌ | 🔴 | No multi-locale sitemap |
| JSON-LD structured data | ❌ | 🔴 | No Article/BreadcrumbList |
| OG image auto-gen | ❌ | 🟡 | Manual upload only |
| Robots block preview | ⚠️ | 🔴 | Needs `?preview` in disallow |

#### 🔴 Critical Issues:

1. **Thiếu Canonical URL enforcement**:
   - SEOMetadata có field `canonicalUrl` nhưng không validate
   - Preview URL không có `<meta name="robots" content="noindex">`

2. **Không có hreflang tags**:
   - Multi-language posts không link với nhau
   - Google không biết en/vi/zh là cùng content

3. **Thiếu JSON-LD**:
   ```typescript
   // blog/[slug]/page.tsx cần thêm:
   <script type="application/ld+json">
   {
     "@context": "https://schema.org",
     "@type": "Article",
     "headline": "...",
     "datePublished": "...",
     "author": {...}
   }
   </script>
   ```

4. **robots.ts không block preview**:
   ```typescript
   // src/app/robots.ts:14 cần thêm
   disallow: [
     '/admin/',
     '/api/',
     '/*?preview=*',  // ❌ Thiếu dòng này
   ]
   ```

#### 🟡 Important Improvements:

1. **OG Image generation**: Cloud Function hoặc Edge Function để generate từ title + featured image

2. **Sitemap multi-locale**:
   ```xml
   <url>
     <loc>https://example.com/en/blog/post-1</loc>
     <xhtml:link rel="alternate" hreflang="vi" href="..." />
     <xhtml:link rel="alternate" hreflang="en" href="..." />
   </url>
   ```

---

## 4) i18n & Slug

### Current Status: 🟡 50% Complete

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Quy ước slug theo locale | ❌ | 🔴 | Single slug for all locales |
| Fallback copy | ❌ | 🟡 | No default language fallback |
| Switch language | ❌ | 🟡 | No locale switcher on public |
| slugByLocale mapping | ❌ | 🔴 | Post type only has one slug |

#### 🔴 Critical Issues:

1. **Slug không unique per locale**:
   - Current: `/blog/my-post` cho cả en và vi
   - Should: `/en/blog/my-post` và `/vi/blog/bai-viet-cua-toi`
   - Type cần đổi từ `slug: string` → `slugs: Record<string, string>`

2. **Không có language routing**:
   - Next.js i18n routing chưa được config
   - Cần thêm middleware để detect và route theo locale

#### 🟡 Important Improvements:

1. **Fallback content**: Khi thiếu bản dịch, hiển thị EN + banner
2. **Language switcher**: Component trên public site để toggle locale
3. **Translation status**: Admin UI hiển thị "Translated: EN, VI | Missing: ZH, JA, KO"

---

## 5) Media & Nội dung

### Current Status: ✅ 85% Complete

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Media Library | ✅ | ✅ | Full CRUD, filter by type |
| Image transforms | ⚠️ | 🟡 | No responsive sizes |
| Accessibility | ⚠️ | 🔴 | Alt text optional |
| File size validation | ❌ | 🟡 | No upload size limit |
| Lazy loading | ❌ | 🟡 | No `loading="lazy"` |

#### 🔴 Critical Issues:

1. **Alt text không bắt buộc**: MediaItem.altText là optional
   - Should: Required field trong upload form

#### 🟡 Important Improvements:

1. **Responsive images**: Generate 320w, 640w, 960w, 1280w, 1920w
2. **File size limit**: Client-side validate < 5MB, server-side < 10MB
3. **Image optimization**: Cloud Function auto-compress on upload

---

## 6) Hiệu năng & Ổn định

### Current Status: 🟡 65% Complete

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| ISR/SSG strategy | ⚠️ | 🔴 | All pages are SSR (slow) |
| Lighthouse ≥ 90 | ❓ | 🔴 | Not tested |
| Cache headers | ❌ | 🟡 | Default Next.js only |
| Node 20 locked | ⚠️ | 🟡 | package.json missing engines |

#### 🔴 Critical Issues:

1. **Blog pages are SSR**:
   ```typescript
   // blog/[slug]/page.tsx uses useParams/useSearchParams
   // ❌ Forces SSR for every request
   // Should: generateStaticParams + ISR revalidation
   ```

2. **Lighthouse score unknown**: Cần chạy và fix CLS, LCP, TBT

#### 🟡 Important Improvements:

1. **ISR strategy**:
   - Blog posts: SSG + revalidate on publish
   - Tours: SSG + revalidate daily
   - Homepage: ISR 60s

2. **Cache headers**:
   ```typescript
   // next.config.ts
   async headers() {
     return [
       { source: '/blog/:slug', headers: [{ key: 'Cache-Control', value: 's-maxage=3600, stale-while-revalidate' }] },
     ]
   }
   ```

3. **Lock Node version**:
   ```json
   // package.json
   "engines": { "node": "20.x" }
   ```

---

## 7) Vận hành & Giám sát

### Current Status: ❌ 20% Complete

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Error tracking | ❌ | 🔴 | No Sentry/logging |
| Analytics | ⚠️ | 🟡 | Basic GA only |
| Backups | ❌ | 🔴 | No Firestore export |
| Rollback plan | ❌ | 🟡 | No version tagging |

#### 🔴 Critical Issues:

1. **Không có error monitoring**:
   - Frontend errors không được track
   - Cloud Function errors chỉ có trong logs

2. **Không có backup tự động**:
   - Firestore data có thể mất do human error
   - Cần lịch `gcloud firestore export`

#### Recommended Setup:

```bash
# 1. Error Tracking
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs

# 2. Firestore Backup (Cloud Scheduler + Cloud Function)
gcloud firestore export gs://my-bucket/firestore-backups/$(date +%Y%m%d)
```

---

## 8) Quy trình soạn thảo

### Current Status: 🟡 70% Complete

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Editorial checklist | ❌ | 🟡 | No validation UI |
| Review workflow | ❌ | 🟡 | No review status |
| Confirm dialogs | ✅ | ✅ | Delete has confirm |
| Word count | ❌ | 🟡 | No reading time calc |

#### 🟡 Improvements:

1. **Editor checklist sidebar**:
   - ✅ Title length ≤ 60 chars
   - ✅ Meta desc 140-160 chars
   - ✅ Featured image set
   - ⚠️ At least 1 H2 heading
   - ❌ Content > 300 words

2. **Review status**: Add `reviewStatus: 'pending' | 'approved' | 'changes_requested'`

---

## 9) Trang Public Cần Hoàn Thiện

### Current Status: 🟡 60% Complete

| Page | Status | Priority | Missing |
|------|--------|----------|---------|
| Home | ✅ | ✅ | Complete |
| /blog | ❌ | 🔴 | List page missing |
| /blog/[slug] | ✅ | ✅ | Complete (needs JSON-LD) |
| /tours/[slug] | ⚠️ | 🟡 | No schema markup |
| /reviews | ✅ | ✅ | Complete |
| /sitemap.xml | ✅ | ✅ | Complete (needs hreflang) |

#### 🔴 Critical Missing:

1. **Blog list page** (`/blog/page.tsx`):
   - Hiển thị tất cả published posts
   - Filter by category/tag
   - Pagination
   - Search

2. **Related posts**: Blog post page thiếu "You may also like"

---

## 10) Pháp lý & Tin cậy

### Current Status: ❌ 30% Complete

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Privacy Policy | ❌ | 🔴 | Page missing |
| Terms of Service | ❌ | 🔴 | Page missing |
| Cookie Consent | ❌ | 🟡 | No banner |
| Contact form captcha | ⚠️ | 🟡 | Has reCAPTCHA setup |

---

## Priority Action Items

### Week 1 (Must Do Before Launch)

1. 🔴 **Add preview token authentication**
2. 🔴 **Fix Firestore rules** - protect status/scheduledAt fields
3. 🔴 **Add JSON-LD structured data** to blog posts
4. 🔴 **Block preview URLs in robots.txt**
5. 🔴 **Create /blog list page**
6. 🔴 **Add Privacy & Terms pages**
7. 🔴 **Setup Firestore backup schedule**
8. 🔴 **Make alt text required**
9. 🔴 **Change scheduler to every 5 minutes**
10. 🔴 **Implement ISR for blog posts**

### Week 2 (Important)

11. 🟡 **Implement hreflang tags**
12. 🟡 **Add audit logging**
13. 🟡 **Setup error monitoring (Sentry)**
14. 🟡 **Add role-based permissions (editor/author)**
15. 🟡 **Implement slugByLocale**
16. 🟡 **Run Lighthouse and fix performance**

### Week 3+ (Nice to Have)

17. 🟢 **OG image auto-generation**
18. 🟢 **Translation fallback system**
19. 🟢 **Editorial checklist UI**
20. 🟢 **Responsive image transforms**

---

## Deployment Checklist

### Pre-Production
- [ ] All Week 1 items completed
- [ ] TypeScript compiles with no errors
- [ ] Firestore rules tested with simulator
- [ ] Lighthouse score ≥ 90 on mobile/desktop
- [ ] Test scheduled publishing in staging
- [ ] Test preview tokens
- [ ] Test version history restore
- [ ] Backup system verified

### Production Deploy
- [ ] Deploy Cloud Functions with v2 scheduler
- [ ] Deploy Firestore rules
- [ ] Deploy Next.js app
- [ ] Enable App Check enforcement
- [ ] Setup monitoring alerts
- [ ] Test end-to-end flow
- [ ] Monitor logs for 24h

### Post-Launch
- [ ] Weekly Firestore backups verified
- [ ] Error rate < 0.1%
- [ ] Performance metrics tracked
- [ ] User feedback collected

---

## Estimated Timeline

**Minimum viable production**: 2-3 weeks
**Full production-ready with all improvements**: 4-6 weeks

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Preview leak | High | High | Add token auth |
| Data loss | Critical | Low | Enable backups |
| SEO penalty | High | Medium | Add JSON-LD, fix robots |
| Performance issues | Medium | High | Implement ISR |
| Timezone bugs | Medium | Medium | Test edge cases |
| Security breach | Critical | Low | Fix Firestore rules |

---

**Next Action**: Start with Week 1 critical items. Assign 1-2 developers for 2 weeks focused work.
