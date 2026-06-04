export interface RoteiroEtapa {
  titulo: string;
  dica: string;
  variantes: { label: string; texto: string }[];
}

export const ROTEIRO: RoteiroEtapa[] = [
  {
    titulo: "1. Abertura",
    dica: "Apresente-se com clareza. Use o nome do cliente. Teste variações A/B/C e veja qual converte mais.",
    variantes: [
      { label: "A — Direta", texto: "Olá [Nome], aqui é do *Grupo Nascimento e Souza*, escritório especializado em defesa de busca e apreensão de veículos pesados. Vi que você tem um caso envolvendo um [veículo] no [tribunal]. Posso te ajudar?" },
      { label: "B — Consultiva", texto: "Olá [Nome], tudo bem? Sou advogado(a) do *Grupo Nascimento e Souza*. Trabalhamos especificamente com defesa de busca e apreensão de caminhões e tratores. Seu [veículo] está em risco no [tribunal]?" },
      { label: "C — Urgência", texto: "[Nome], boa tarde. Aqui é do *Grupo Nascimento e Souza*. Soubemos da ação de busca e apreensão do seu [veículo] no [tribunal]. O prazo para defesa é curto — posso te explicar em 2 minutos como podemos te ajudar?" },
    ],
  },
  {
    titulo: "2. Qualificação",
    dica: "Confirme dados do caso antes de avançar. Pergunte de forma simples.",
    variantes: [
      { label: "Padrão", texto: "Para te orientar melhor, me confirma: o [veículo] já foi apreendido ou ainda está com você? Você já foi notificado pelo [tribunal]? Tem o número do processo?" },
    ],
  },
  {
    titulo: "3. Apresentação de valor",
    dica: "Mostre autoridade sem ser arrogante. Cite o foco no nicho.",
    variantes: [
      { label: "Padrão", texto: "[Nome], o *Grupo Nascimento e Souza* atua há anos *somente* em defesa de busca e apreensão de caminhões e tratores. Já recuperamos veículos em situações parecidas com a sua. Trabalhamos com liminares rápidas para devolução do bem." },
    ],
  },
  {
    titulo: "4. Quebra de objeção",
    dica: "Antecipe as dúvidas mais comuns: preço, prazo, garantia.",
    variantes: [
      { label: "Preço", texto: "Entendo a preocupação com o investimento, [Nome]. Mas pense: o valor do seu [veículo] é muito maior que os honorários. E parcelamos. Posso te enviar a proposta?" },
      { label: "Prazo", texto: "[Nome], em casos de busca e apreensão o tempo é crítico. Quanto antes entrarmos com a defesa, maior a chance de manter o [veículo] com você. Podemos iniciar hoje mesmo." },
    ],
  },
  {
    titulo: "5. Fechamento",
    dica: "Seja direto. Marque próximo passo com data e hora.",
    variantes: [
      { label: "Padrão", texto: "[Nome], posso te enviar o contrato agora pelo WhatsApp para você analisar? Assim já garantimos a entrada da defesa ainda esta semana no [tribunal]. Combinado?" },
    ],
  },
];
