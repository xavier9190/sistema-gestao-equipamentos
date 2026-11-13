"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

interface CategoriaOption {
  id: string;
  nome: string;
}

interface EquipamentoPrincipalOption {
  id: string;
  nome: string;
  codigoPatrimonio: string | null;
  codigoInterno: string | null;
  equipamentoPrincipalId: string | null;
}

export default function NovoEquipamentoPage() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<CategoriaOption[]>([]);
  const [principais, setPrincipais] = useState<EquipamentoPrincipalOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [nome, setNome] = useState("");
  const [possuiPatrimonio, setPossuiPatrimonio] = useState(false);
  const [codigoPatrimonio, setCodigoPatrimonio] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [localizacao, setLocalizacao] = useState("Coordenação");
  const [estadoConservacao, setEstadoConservacao] = useState("BOM");
  const [valorAproximado, setValorAproximado] = useState("");
  const [emprestavel, setEmprestavel] = useState(true);
  const [equipamentoPrincipalId, setEquipamentoPrincipalId] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [catRes, eqRes] = await Promise.all([
          fetch("/api/categorias"),
          fetch("/api/equipamentos"),
        ]);

        if (catRes.ok) {
          const catData = (await catRes.json()) as {
            categorias?: CategoriaOption[];
          };
          const list = catData.categorias ?? [];
          setCategorias(list);
          if (list.length > 0) {
            setCategoriaId(list[0].id);
          }
        }

        if (eqRes.ok) {
          const eqData = (await eqRes.json()) as {
            equipamentos?: EquipamentoPrincipalOption[];
          };
          const elegiveis = (eqData.equipamentos ?? []).filter(
            (eq) => eq.equipamentoPrincipalId === null
          );
          setPrincipais(elegiveis);
        }
      } finally {
        setLoadingOptions(false);
      }
    }

    loadOptions();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const parsedValor =
      valorAproximado.trim() !== ""
        ? Number.parseFloat(valorAproximado.replace(",", "."))
        : null;

    if (parsedValor !== null && (Number.isNaN(parsedValor) || parsedValor < 0)) {
      setErrorMessage("Informe um valor aproximado válido.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/equipamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          codigoPatrimonio: possuiPatrimonio ? codigoPatrimonio : null,
          categoriaId,
          localizacao,
          estadoConservacao,
          valorAproximado: parsedValor,
          emprestavel,
          equipamentoPrincipalId: equipamentoPrincipalId || null,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        equipamento?: { id: string; codigoInterno: string | null };
      };

      if (!response.ok || !data.ok || !data.equipamento) {
        setErrorMessage(data.message ?? "Não foi possível cadastrar o item.");
        return;
      }

      if (data.equipamento.codigoInterno) {
        router.push(`/equipamentos/${data.equipamento.id}/etiqueta`);
      } else {
        router.push("/equipamentos");
      }
      router.refresh();
    } catch {
      setErrorMessage("Erro de conexão ao cadastrar item.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Novo item
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Cadastro manual de equipamentos, chaves ou acessórios vinculados.
          </p>
        </div>
        <Link
          href="/equipamentos"
          className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          ← Voltar
        </Link>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label
            htmlFor="nome"
            className="block text-sm font-medium text-neutral-700"
          >
            Nome do equipamento *
          </label>
          <input
            id="nome"
            type="text"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Chave do Laboratório 4, Carregador Dell 65W"
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none"
          />
        </div>

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-800">
            <input
              type="checkbox"
              checked={possuiPatrimonio}
              onChange={(e) => setPossuiPatrimonio(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-emerald-700"
            />
            Item já possui Código de Patrimônio tombado
          </label>

          {possuiPatrimonio ? (
            <div className="mt-3">
              <label
                htmlFor="codigoPatrimonio"
                className="block text-xs font-medium text-neutral-700"
              >
                Código de Patrimônio *
              </label>
              <input
                id="codigoPatrimonio"
                type="text"
                required
                value={codigoPatrimonio}
                onChange={(e) => setCodigoPatrimonio(e.target.value)}
                placeholder="Ex: PAT 000123"
                className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>
          ) : (
            <p className="mt-1 text-xs text-neutral-600">
              Será gerado automaticamente um código interno{" "}
              <span className="font-mono font-semibold">INT-XXXX</span> com
              etiqueta QR Code pronta para impressão.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="categoriaId"
              className="block text-sm font-medium text-neutral-700"
            >
              Categoria *
            </label>
            <select
              id="categoriaId"
              required
              disabled={loadingOptions || categorias.length === 0}
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            >
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="localizacao"
              className="block text-sm font-medium text-neutral-700"
            >
              Localização *
            </label>
            <input
              id="localizacao"
              type="text"
              required
              value={localizacao}
              onChange={(e) => setLocalizacao(e.target.value)}
              placeholder="Ex: Coordenação, Sala 12"
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="estadoConservacao"
              className="block text-sm font-medium text-neutral-700"
            >
              Estado de conservação
            </label>
            <select
              id="estadoConservacao"
              value={estadoConservacao}
              onChange={(e) => setEstadoConservacao(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            >
              <option value="BOM">Bom</option>
              <option value="REGULAR">Regular</option>
              <option value="COM_DEFEITO">Com defeito</option>
              <option value="DANIFICADO">Danificado</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="valorAproximado"
              className="block text-sm font-medium text-neutral-700"
            >
              Valor aproximado (R$)
            </label>
            <input
              id="valorAproximado"
              type="text"
              inputMode="decimal"
              value={valorAproximado}
              onChange={(e) => setValorAproximado(e.target.value)}
              placeholder="Opcional (ex: 150.00)"
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="equipamentoPrincipalId"
            className="block text-sm font-medium text-neutral-700"
          >
            Acessório vinculado a (opcional)
          </label>
          <select
            id="equipamentoPrincipalId"
            value={equipamentoPrincipalId}
            onChange={(e) => setEquipamentoPrincipalId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
          >
            <option value="">Nenhum (equipamento independente)</option>
            {principais.map((item) => {
              const code = item.codigoPatrimonio ?? item.codigoInterno ?? "";
              return (
                <option key={item.id} value={item.id}>
                  {item.nome} {code ? `(${code})` : ""}
                </option>
              );
            })}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={emprestavel}
            onChange={(e) => setEmprestavel(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-emerald-700"
          />
          Disponível para empréstimo (Emprestável)
        </label>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {errorMessage}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/equipamentos"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || loadingOptions}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
          >
            {isSubmitting ? "Salvando..." : "Salvar item"}
          </button>
        </div>
      </form>
    </main>
  );
}
