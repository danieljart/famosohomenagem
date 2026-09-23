CREATE TABLE public.homenagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criador TEXT NOT NULL,
  arroba TEXT NOT NULL DEFAULT '',
  famoso TEXT NOT NULL,
  data DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.homenagens TO anon, authenticated;
GRANT ALL ON public.homenagens TO service_role;
ALTER TABLE public.homenagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos podem ver" ON public.homenagens FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Todos podem adicionar" ON public.homenagens FOR INSERT TO anon, authenticated WITH CHECK (length(criador) BETWEEN 1 AND 200 AND length(famoso) BETWEEN 1 AND 200 AND length(arroba) <= 200);