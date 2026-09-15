/** JSON-LD schema generation for common schema.org types */

export const SCHEMA_TYPES = [
  "Article",
  "FAQ",
  "Product",
  "Organization",
  "LocalBusiness",
  "Person",
  "Event",
  "Recipe",
  "Review",
  "Breadcrumb",
  "WebSite",
  "Service",
  "Course",
] as const;

export type SchemaType = (typeof SCHEMA_TYPES)[number];

/** Field definitions drive the dynamic form UI */
export interface SchemaField {
  name: string;
  label: string;
  type: "text" | "textarea" | "url" | "date" | "number" | "list" | "select";
  required?: boolean;
  options?: string[];
  placeholder?: string;
  hint?: string;
}

export interface SchemaTypeDefinition {
  type: SchemaType;
  contextUrl: string;
  fields: SchemaField[];
  /** build the @type object from form values */
  build: (values: Record<string, string>) => Record<string, unknown>;
}

const f = (
  name: string,
  label: string,
  type: SchemaField["type"],
  required = false,
  extra: Partial<SchemaField> = {}
): SchemaField => ({ name, label, type, required, ...extra });

const list = (value: string): string[] =>
  value.split("\n").map((v) => v.trim()).filter(Boolean);

const orUndefined = (value: string): string | undefined => {
  const t = value.trim();
  return t ? t : undefined;
};

export const SCHEMA_DEFINITIONS: SchemaTypeDefinition[] = [
  {
    type: "Article",
    contextUrl: "https://schema.org/Article",
    fields: [
      f("headline", "Headline", "text", true, { placeholder: "Article headline (max ~110 chars)" }),
      f("image", "Image URL", "url", true),
      f("authorName", "Author name", "text", true),
      f("datePublished", "Date published", "date", true),
      f("dateModified", "Date modified", "date"),
      f("publisherName", "Publisher name", "text", true),
      f("publisherLogo", "Publisher logo URL", "url"),
      f("description", "Description", "textarea"),
    ],
    build: (v) => ({
      "@type": "Article",
      headline: v.headline,
      image: [v.image],
      author: { "@type": "Person", name: v.authorName },
      datePublished: v.datePublished,
      dateModified: orUndefined(v.dateModified) ?? v.datePublished,
      publisher: {
        "@type": "Organization",
        name: v.publisherName,
        ...(orUndefined(v.publisherLogo) ? { logo: { "@type": "ImageObject", url: v.publisherLogo } } : {}),
      },
      ...(orUndefined(v.description) ? { description: v.description } : {}),
    }),
  },
  {
    type: "FAQ",
    contextUrl: "https://schema.org/FAQPage",
    fields: [
      f("question1", "Question 1", "text", true),
      f("answer1", "Answer 1", "textarea", true),
      f("question2", "Question 2", "text"),
      f("answer2", "Answer 2", "textarea"),
      f("question3", "Question 3", "text"),
      f("answer3", "Answer 3", "textarea"),
    ],
    build: (v) => ({
      "@type": "FAQPage",
      mainEntity: [1, 2, 3]
        .map((i) => ({ q: v[`question${i}`], a: v[`answer${i}`] }))
        .filter((p) => p.q?.trim() && p.a?.trim())
        .map((p) => ({
          "@type": "Question",
          name: p.q,
          acceptedAnswer: { "@type": "Answer", text: p.a },
        })),
    }),
  },
  {
    type: "Product",
    contextUrl: "https://schema.org/Product",
    fields: [
      f("name", "Product name", "text", true),
      f("image", "Image URL", "url", true),
      f("description", "Description", "textarea"),
      f("sku", "SKU", "text"),
      f("brand", "Brand", "text"),
      f("price", "Price", "text", true),
      f("priceCurrency", "Currency", "select", true, {
        options: ["USD", "EUR", "GBP", "TRY", "AUD", "CAD", "CHF", "CNY", "INR", "JPY"],
      }),
      f("ratingValue", "Rating value", "number"),
      f("ratingCount", "Rating count", "number"),
      f("availability", "Availability", "select", false, {
        options: ["InStock", "OutOfStock", "PreOrder", "Discontinued"],
      }),
    ],
    build: (v) => ({
      "@type": "Product",
      name: v.name,
      image: [v.image],
      ...(orUndefined(v.description) ? { description: v.description } : {}),
      ...(orUndefined(v.sku) ? { sku: v.sku } : {}),
      ...(orUndefined(v.brand) ? { brand: { "@type": "Brand", name: v.brand } } : {}),
      offers: {
        "@type": "Offer",
        price: v.price,
        priceCurrency: v.priceCurrency,
        ...(orUndefined(v.availability) ? { availability: `https://schema.org/${v.availability}` } : {}),
      },
      ...(orUndefined(v.ratingValue) && orUndefined(v.ratingCount)
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: v.ratingValue,
              reviewCount: v.ratingCount,
            },
          }
        : {}),
    }),
  },
  {
    type: "Organization",
    contextUrl: "https://schema.org/Organization",
    fields: [
      f("name", "Organization name", "text", true),
      f("url", "Website URL", "url", true),
      f("logo", "Logo URL", "url"),
      f("sameAs", "Social profiles (one per line)", "list", false, {
        placeholder: "https://twitter.com/handle\nhttps://linkedin.com/company/handle",
      }),
      f("contactEmail", "Contact email", "text"),
      f("contactPhone", "Contact phone", "text"),
    ],
    build: (v) => ({
      "@type": "Organization",
      name: v.name,
      url: v.url,
      ...(orUndefined(v.logo) ? { logo: v.logo } : {}),
      ...(list(v.sameAs).length ? { sameAs: list(v.sameAs) } : {}),
      ...(orUndefined(v.contactEmail) || orUndefined(v.contactPhone)
        ? {
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "customer support",
              ...(orUndefined(v.contactEmail) ? { email: v.contactEmail } : {}),
              ...(orUndefined(v.contactPhone) ? { telephone: v.contactPhone } : {}),
            },
          }
        : {}),
    }),
  },
  {
    type: "LocalBusiness",
    contextUrl: "https://schema.org/LocalBusiness",
    fields: [
      f("name", "Business name", "text", true),
      f("image", "Image URL", "url"),
      f("url", "Website URL", "url"),
      f("telephone", "Telephone", "text", true),
      f("streetAddress", "Street address", "text", true),
      f("addressLocality", "City", "text", true),
      f("addressRegion", "State / region", "text"),
      f("postalCode", "Postal code", "text", true),
      f("addressCountry", "Country code", "text", true, { placeholder: "US" }),
      f("latitude", "Latitude", "text"),
      f("longitude", "Longitude", "text"),
      f("priceRange", "Price range", "text", false, { placeholder: "$$" }),
    ],
    build: (v) => ({
      "@type": "LocalBusiness",
      name: v.name,
      ...(orUndefined(v.image) ? { image: [v.image] } : {}),
      ...(orUndefined(v.url) ? { url: v.url } : {}),
      telephone: v.telephone,
      address: {
        "@type": "PostalAddress",
        streetAddress: v.streetAddress,
        addressLocality: v.addressLocality,
        ...(orUndefined(v.addressRegion) ? { addressRegion: v.addressRegion } : {}),
        postalCode: v.postalCode,
        addressCountry: v.addressCountry,
      },
      ...(orUndefined(v.latitude) && orUndefined(v.longitude)
        ? {
            geo: {
              "@type": "GeoCoordinates",
              latitude: v.latitude,
              longitude: v.longitude,
            },
          }
        : {}),
      ...(orUndefined(v.priceRange) ? { priceRange: v.priceRange } : {}),
    }),
  },
  {
    type: "Person",
    contextUrl: "https://schema.org/Person",
    fields: [
      f("name", "Full name", "text", true),
      f("jobTitle", "Job title", "text"),
      f("worksFor", "Works for (organization)", "text"),
      f("url", "Profile / website URL", "url"),
      f("image", "Photo URL", "url"),
      f("sameAs", "Social profiles (one per line)", "list"),
    ],
    build: (v) => ({
      "@type": "Person",
      name: v.name,
      ...(orUndefined(v.jobTitle) ? { jobTitle: v.jobTitle } : {}),
      ...(orUndefined(v.worksFor) ? { worksFor: { "@type": "Organization", name: v.worksFor } } : {}),
      ...(orUndefined(v.url) ? { url: v.url } : {}),
      ...(orUndefined(v.image) ? { image: v.image } : {}),
      ...(list(v.sameAs).length ? { sameAs: list(v.sameAs) } : {}),
    }),
  },
  {
    type: "Event",
    contextUrl: "https://schema.org/Event",
    fields: [
      f("name", "Event name", "text", true),
      f("startDate", "Start date & time", "date", true),
      f("endDate", "End date & time", "date"),
      f("eventAttendanceMode", "Attendance mode", "select", true, {
        options: ["OfflineEventAttendanceMode", "OnlineEventAttendanceMode", "MixedEventAttendanceMode"],
      }),
      f("eventStatus", "Status", "select", true, {
        options: ["EventScheduled", "EventMovedOnline", "EventPostponed", "EventRescheduled", "EventCancelled"],
      }),
      f("locationName", "Location name / URL", "text", true),
      f("locationAddress", "Location address", "text"),
      f("description", "Description", "textarea"),
      f("image", "Image URL", "url"),
      f("price", "Ticket price", "text"),
      f("priceCurrency", "Currency", "text"),
      f("availability", "Availability URL", "url"),
    ],
    build: (v) => ({
      "@type": "Event",
      name: v.name,
      startDate: v.startDate,
      ...(orUndefined(v.endDate) ? { endDate: v.endDate } : {}),
      eventAttendanceMode: `https://schema.org/${v.eventAttendanceMode}`,
      eventStatus: `https://schema.org/${v.eventStatus}`,
      location: orUndefined(v.locationAddress)
        ? { "@type": "Place", name: v.locationName, address: v.locationAddress }
        : { "@type": "VirtualLocation", name: v.locationName, url: v.locationName },
      ...(orUndefined(v.description) ? { description: v.description } : {}),
      ...(orUndefined(v.image) ? { image: [v.image] } : {}),
      ...(orUndefined(v.price)
        ? {
            offers: {
              "@type": "Offer",
              price: v.price,
              priceCurrency: orUndefined(v.priceCurrency) ?? "USD",
              ...(orUndefined(v.availability) ? { availability: v.availability } : {}),
            },
          }
        : {}),
    }),
  },
  {
    type: "Recipe",
    contextUrl: "https://schema.org/Recipe",
    fields: [
      f("name", "Recipe name", "text", true),
      f("image", "Image URL", "url", true),
      f("author", "Author", "text", true),
      f("datePublished", "Date published", "date"),
      f("description", "Description", "textarea", true),
      f("prepTime", "Prep time (ISO 8601)", "text", false, { placeholder: "PT20M" }),
      f("cookTime", "Cook time (ISO 8601)", "text", false, { placeholder: "PT30M" }),
      f("recipeYield", "Yield", "text", false, { placeholder: "4 servings" }),
      f("recipeIngredient", "Ingredients (one per line)", "list", true),
      f("recipeInstructions", "Instructions (one step per line)", "list", true),
      f("recipeCategory", "Category", "text"),
      f("recipeCuisine", "Cuisine", "text"),
    ],
    build: (v) => ({
      "@type": "Recipe",
      name: v.name,
      image: [v.image],
      author: { "@type": "Person", name: v.author },
      ...(orUndefined(v.datePublished) ? { datePublished: v.datePublished } : {}),
      description: v.description,
      ...(orUndefined(v.prepTime) ? { prepTime: v.prepTime } : {}),
      ...(orUndefined(v.cookTime) ? { cookTime: v.cookTime } : {}),
      ...(orUndefined(v.recipeYield) ? { recipeYield: v.recipeYield } : {}),
      recipeIngredient: list(v.recipeIngredient),
      recipeInstructions: list(v.recipeInstructions).map((step) => ({
        "@type": "HowToStep",
        text: step,
      })),
      ...(orUndefined(v.recipeCategory) ? { recipeCategory: v.recipeCategory } : {}),
      ...(orUndefined(v.recipeCuisine) ? { recipeCuisine: v.recipeCuisine } : {}),
    }),
  },
  {
    type: "Review",
    contextUrl: "https://schema.org/Review",
    fields: [
      f("itemName", "Reviewed item name", "text", true),
      f("itemType", "Item type", "select", true, {
        options: ["Product", "Book", "Movie", "SoftwareApplication", "Service"],
      }),
      f("author", "Review author", "text", true),
      f("datePublished", "Review date", "date", true),
      f("reviewBody", "Review body", "textarea", true),
      f("ratingValue", "Rating (1-5)", "number", true),
      f("bestRating", "Best rating", "text", false, { placeholder: "5" }),
    ],
    build: (v) => ({
      "@type": "Review",
      itemReviewed: { "@type": v.itemType, name: v.itemName },
      author: { "@type": "Person", name: v.author },
      datePublished: v.datePublished,
      reviewBody: v.reviewBody,
      reviewRating: {
        "@type": "Rating",
        ratingValue: v.ratingValue,
        bestRating: orUndefined(v.bestRating) ?? "5",
        worstRating: "1",
      },
    }),
  },
  {
    type: "Breadcrumb",
    contextUrl: "https://schema.org/BreadcrumbList",
    fields: [
      f("trail", "Breadcrumb trail (one per line: Position|Name|URL)", "list", true, {
        placeholder:
          "1|Home|https://example.com\n2|Category|https://example.com/category\n3|Page|https://example.com/category/page",
      }),
    ],
    build: (v) => ({
      "@type": "BreadcrumbList",
      itemListElement: list(v.trail).map((row) => {
        const [position, name, url] = row.split("|").map((p) => p.trim());
        return {
          "@type": "ListItem",
          position: Number(position) || 1,
          name,
          ...(url ? { item: url } : {}),
        };
      }),
    }),
  },
  {
    type: "WebSite",
    contextUrl: "https://schema.org/WebSite",
    fields: [
      f("name", "Site name", "text", true),
      f("url", "Site URL", "url", true),
      f("searchUrl", "Search results URL template", "text", false, {
        placeholder: "https://example.com/search?q={search_term_string}",
      }),
    ],
    build: (v) => ({
      "@type": "WebSite",
      name: v.name,
      url: v.url,
      ...(orUndefined(v.searchUrl)
        ? {
            potentialAction: {
              "@type": "SearchAction",
              target: { "@type": "EntryPoint", urlTemplate: v.searchUrl },
              "query-input": "required name=search_term_string",
            },
          }
        : {}),
    }),
  },
  {
    type: "Service",
    contextUrl: "https://schema.org/Service",
    fields: [
      f("name", "Service name", "text", true),
      f("serviceType", "Service type", "text", true),
      f("description", "Description", "textarea"),
      f("providerName", "Provider name", "text", true),
      f("providerUrl", "Provider URL", "url"),
      f("areaServed", "Area served", "text"),
    ],
    build: (v) => ({
      "@type": "Service",
      name: v.name,
      serviceType: v.serviceType,
      ...(orUndefined(v.description) ? { description: v.description } : {}),
      provider: {
        "@type": "Organization",
        name: v.providerName,
        ...(orUndefined(v.providerUrl) ? { url: v.providerUrl } : {}),
      },
      ...(orUndefined(v.areaServed) ? { areaServed: v.areaServed } : {}),
    }),
  },
  {
    type: "Course",
    contextUrl: "https://schema.org/Course",
    fields: [
      f("name", "Course name", "text", true),
      f("description", "Description", "textarea", true),
      f("providerName", "Provider name", "text", true),
      f("providerUrl", "Provider URL", "url"),
      f("courseCode", "Course code", "text"),
    ],
    build: (v) => ({
      "@type": "Course",
      name: v.name,
      description: v.description,
      provider: {
        "@type": "Organization",
        name: v.providerName,
        ...(orUndefined(v.providerUrl) ? { url: v.providerUrl } : {}),
      },
      ...(orUndefined(v.courseCode) ? { courseCode: v.courseCode } : {}),
    }),
  },
];

export function getSchemaDefinition(type: SchemaType): SchemaTypeDefinition {
  const def = SCHEMA_DEFINITIONS.find((d) => d.type === type);
  if (!def) throw new Error(`Unknown schema type: ${type}`);
  return def;
}

/** Build a full JSON-LD body */
export function buildJsonLd(type: SchemaType, values: Record<string, string>): string {
  const def = getSchemaDefinition(type);
  const payload = { "@context": "https://schema.org", ...def.build(values) };
  return JSON.stringify(payload, null, 2);
}

/** Validate that generated JSON-LD parses and required fields are present */
export function validateSchema(
  type: SchemaType,
  values: Record<string, string>
): { ok: boolean; errors: string[]; json: string } {
  const def = getSchemaDefinition(type);
  const errors: string[] = [];
  for (const field of def.fields) {
    if (field.required && !values[field.name]?.trim()) errors.push(`${field.label} is required`);
  }
  let json = "";
  if (errors.length === 0) {
    try {
      json = buildJsonLd(type, values);
      JSON.parse(json);
    } catch {
      errors.push("Generated JSON-LD failed to parse");
    }
  }
  return { ok: errors.length === 0, errors, json };
}
