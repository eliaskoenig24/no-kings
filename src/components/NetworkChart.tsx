'use client';

import { TOPIC_EMOJIS, TOPICS, type TopicKey } from '@/types';
import { useLang } from '@/context/LangContext';
import { getTopicLabel } from '@/lib/i18n';

const NET_TX = {
  header:   { de: 'Netzwerk-Übersicht', en: 'Network Overview', es: 'Resumen de la red', fr: 'Aperçu du réseau', pt: 'Visão geral da rede', ar: 'نظرة عامة على الشبكة', zh: '网络概览', ja: 'ネットワーク概要', hi: 'नेटवर्क अवलोकन', ru: 'Обзор сети', id: 'Gambaran Jaringan', tr: 'Ağ Özeti', ko: '네트워크 개요', it: 'Panoramica della rete', nl: 'Netwerkoverzicht', pl: 'Przegląd sieci', uk: 'Огляд мережі', vi: 'Tổng quan mạng lưới', bn: 'নেটওয়ার্ক ওভারভিউ', fa: 'نمای کلی شبکه' },
  twins_in: { de: 'Zwillinge im Netzwerk', en: 'twins in network', es: 'gemelos en la red', fr: 'jumeaux dans le réseau', pt: 'gêmeos na rede', ar: 'توأم في الشبكة', zh: '个孪生体在网络中', ja: 'ネットワーク内のツイン', hi: 'नेटवर्क में जुड़वाँ', ru: 'двойников в сети', id: 'kembaran di jaringan', tr: 'ikiz ağda', ko: '명의 트윈이 네트워크에', it: 'gemelli nella rete', nl: 'tweelingen in het netwerk', pl: 'bliźniaków w sieci', uk: 'двійників у мережі', vi: 'sinh đôi trong mạng', bn: 'যমজ নেটওয়ার্কে', fa: 'دوقلو در شبکه' },
  net_avg:  { de: 'Netzwerk-Durchschnitt', en: 'Network average', es: 'Promedio de la red', fr: 'Moyenne du réseau', pt: 'Média da rede', ar: 'متوسط الشبكة', zh: '网络平均值', ja: 'ネットワーク平均', hi: 'नेटवर्क औसत', ru: 'Средняя по сети', id: 'Rata-rata jaringan', tr: 'Ağ ortalaması', ko: '네트워크 평균', it: 'Media della rete', nl: 'Netwerkgemiddelde', pl: 'Średnia sieci', uk: 'Середнє по мережі', vi: 'Trung bình mạng', bn: 'নেটওয়ার্ক গড়', fa: 'میانگین شبکه' },
  my_twin:  { de: 'Dein Zwilling', en: 'Your twin', es: 'Tu gemelo', fr: 'Ton jumeau', pt: 'Seu gêmeo', ar: 'توأمك', zh: '你的孪生体', ja: 'あなたのツイン', hi: 'आपका जुड़वाँ', ru: 'Ваш двойник', id: 'Kembaranmu', tr: 'İkizin', ko: '내 트윈', it: 'Il tuo gemello', nl: 'Jouw tweeling', pl: 'Twój bliźniak', uk: 'Ваш двійник', vi: 'Sinh đôi của bạn', bn: 'আপনার যমজ', fa: 'دوقلوی شما' },
};

interface NetworkChartProps {
  averages: {
    klimaschutz: number;
    sozialstaat: number;
    wirtschaft: number;
    bildung: number;
    gesundheit: number;
    migration: number;
    freiheit: number;
    europa: number;
  };
  userTwin?: {
    klimaschutz: number;
    sozialstaat: number;
    wirtschaft: number;
    bildung: number;
    gesundheit: number;
    migration: number;
    freiheit: number;
    europa: number;
  };
  count: number;
}

function TopicRow({
  topic,
  average,
  userValue,
  lang,
  myTwinLabel,
}: {
  topic: TopicKey;
  average: number;
  userValue?: number;
  lang: string;
  myTwinLabel: string;
}) {
  const pct = Math.min(100, Math.max(0, Math.round(average)));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-slate-300 font-medium">
          <span>{TOPIC_EMOJIS[topic]}</span>
          <span>{getTopicLabel(topic, lang)}</span>
        </span>
        <span className="text-slate-400 tabular-nums">{pct}%</span>
      </div>

      <div className="relative w-full h-2.5 bg-slate-800 rounded-full overflow-visible">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />

        {userValue !== undefined && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-blue-400 border-2 border-slate-900 shadow-md transition-all duration-500 ease-out"
            style={{ left: `calc(${Math.min(100, Math.max(0, Math.round(userValue)))}% - 7px)` }}
            title={`${myTwinLabel}: ${Math.round(userValue)}%`}
          />
        )}
      </div>
    </div>
  );
}

export default function NetworkChart({ averages, userTwin, count }: NetworkChartProps) {
  const { lang } = useLang();
  const tx = (key: keyof typeof NET_TX) => (NET_TX[key] as Record<string, string>)[lang] ?? (NET_TX[key] as Record<string, string>).en;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-slate-50 font-semibold text-base">{tx('header')}</h3>
        <span className="text-sm text-slate-400">
          <span className="text-blue-400 font-semibold tabular-nums">{count.toLocaleString()}</span>
          {' '}{tx('twins_in')}
        </span>
      </div>

      {userTwin && (
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-2 rounded-full bg-blue-600" />
            {tx('net_avg')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-400 border border-slate-900" />
            {tx('my_twin')}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {TOPICS.map((topic) => (
          <TopicRow
            key={topic}
            topic={topic}
            average={averages[topic]}
            userValue={userTwin?.[topic]}
            lang={lang}
            myTwinLabel={tx('my_twin')}
          />
        ))}
      </div>
    </div>
  );
}
