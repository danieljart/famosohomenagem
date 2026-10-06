CREATE TABLE public.trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  link text,
  plataforma text NOT NULL DEFAULT 'instagram',
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.trends TO anon, authenticated;
GRANT ALL ON public.trends TO service_role;
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos veem trends" ON public.trends FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Todos adicionam trends" ON public.trends FOR INSERT TO anon, authenticated
  WITH CHECK (length(nome) BETWEEN 1 AND 200 AND upvotes = 0 AND downvotes = 0
    AND plataforma IN ('instagram','tiktok','x','facebook','youtube','outro'));
CREATE OR REPLACE FUNCTION public.vote_trend(_id uuid, _delta_up int, _delta_down int)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.trends
  SET upvotes = GREATEST(0, upvotes + GREATEST(-1, LEAST(1, _delta_up))),
      downvotes = GREATEST(0, downvotes + GREATEST(-1, LEAST(1, _delta_down)))
  WHERE id = _id;
$$;
GRANT EXECUTE ON FUNCTION public.vote_trend(uuid, int, int) TO anon, authenticated;