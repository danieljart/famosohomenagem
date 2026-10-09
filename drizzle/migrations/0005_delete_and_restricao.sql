GRANT DELETE ON public.homenagens TO anon, authenticated;
CREATE POLICY "Todos podem apagar" ON public.homenagens FOR DELETE TO anon, authenticated USING (true);
GRANT DELETE ON public.trends TO anon, authenticated;
CREATE POLICY "Todos apagam trends" ON public.trends FOR DELETE TO anon, authenticated USING (true);
DROP POLICY "Todos podem atualizar" ON public.homenagens;
CREATE POLICY "Todos podem atualizar" ON public.homenagens FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (status IN ('postado','em_producao','restricao') AND length(criador) BETWEEN 1 AND 200 AND length(famoso) BETWEEN 1 AND 200 AND length(arroba) <= 200);
CREATE OR REPLACE FUNCTION public.limpar_producao_antiga()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.homenagens WHERE status = 'em_producao' AND COALESCE(data, created_at::date) < current_date - 7;
$$;
GRANT EXECUTE ON FUNCTION public.limpar_producao_antiga() TO anon, authenticated;