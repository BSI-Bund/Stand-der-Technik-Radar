export type TaxonomyCounts = {
  controls: number;
  components: number;
  total: number;
};

export type TaxonomyNode = {
  id: string;
  label: string;
  level: number;
  kind?: 'overview' | 'function' | 'technology_domain' | 'product_category' | 'product_group';
  view_ref?: string;
  color?: string;
  row_id?: string;
  nist_code?: string;
  nist_category?: string;
  product_category?: string;
  details?: string;
  counts: TaxonomyCounts;
  display_weight?: number;
  mapping_ids?: string[];
  children?: TaxonomyNode[];
};

export type TaxonomyMapping = {
  mapping_key: string;
  item_type: 'control' | 'component';
  id: string;
  identity: string;
  title: string;
  uuid: string;
  source_title: string;
  source_uuid: string;
  source_path: string;
  source_origin: 'public' | 'manual';
  source_url: string | null;
  taxonomy: {
    leaf_id: string;
    level1: string;
    level2: string;
    technology_domain?: string;
    product_category?: string;
    product_group?: string;
    level3: string;
  };
};

export type TaxonomyMapData = {
  schema_version: string;
  generated_at: string;
  stats: {
    mapped_total: number;
    mapped_controls: number;
    mapped_components: number;
  };
  hierarchy: TaxonomyNode;
  views?: {
    overview: TaxonomyNode;
    domains: Record<string, TaxonomyNode>;
    functions: Record<string, TaxonomyNode>;
  };
  mappings: TaxonomyMapping[];
};

export type TrendManifestYear = {
  year: number;
  label: string;
  enabled: boolean;
  trend_pack: string;
  aggregates: string;
};

export type TrendManifest = {
  schema_version: string;
  generated_at: string;
  available_years: TrendManifestYear[];
};

export type TrendPack = {
  schema_version: string;
  year: number;
  label: string;
  status: string;
  clusters: Array<{
    id: string;
    label: string;
    short_label?: string;
    description?: string;
    color: string;
    map_position: { x: number; y: number };
  }>;
  themes: Array<{
    id: string;
    cluster_id: string;
    label: string;
    short_label?: string;
    description: string;
    management_summary: string;
    color: string;
    map_position: { x: number; y: number };
    facets?: Array<{ id: string; label: string; description: string; weight: number }>;
  }>;
};

export type TrendThemeAggregate = {
  trend_theme_id: string;
  cluster_id: string;
  label: string;
  short_label?: string;
  management_summary: string;
  counts: {
    items_total?: number;
    controls_total?: number;
    components_total?: number;
    requirements_total: number;
    requirements_strong: number;
    requirements_medium: number;
    requirements_weak: number;
    catalog_count: number;
    target_object_count: number;
    tag_count: number;
  };
  radar: { presence: number; depth: number; breadth: number; coverage: number } | null;
  display: {
    presence_pct: number | null;
    depth_pct: number | null;
    breadth_pct: number | null;
    coverage_pct: number | null;
    coverage_label: string;
    color: string;
    is_placeholder: boolean;
  };
  top_tags: string[];
  top_target_objects: string[];
  requirements?: Array<{
    requirement_id: string;
    title: string;
    uuid: string;
    score?: number;
    strength?: string;
  }>;
  components?: Array<{
    component_id: string;
    title: string;
    uuid: string;
    score?: number;
    strength?: string;
  }>;
  map_position: { x: number; y: number };
};

export type TrendAggregates = {
  schema_version: string;
  year: number;
  generated_at: string;
  themes: TrendThemeAggregate[];
  clusters: Array<{
    cluster_id: string;
    label: string;
    short_label?: string;
    description: string;
    theme_count: number;
    avg_coverage: number | null;
    display: { avg_coverage_pct: number | null; coverage_label: string; color: string };
    map_position: { x: number; y: number };
  }>;
  kpis: Array<{ id: string; label: string; value: number }>;
};
