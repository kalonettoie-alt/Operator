import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const QUESTIONS = [
  {
    id: 1,
    question: 'Quelle est la première chose à faire en arrivant dans un logement pour une intervention ?',
    options: [
      'Commencer à nettoyer immédiatement',
      'Prendre les photos "avant" de chaque pièce',
      'Appeler le client',
      'Vérifier les réseaux sociaux',
    ],
    correct: 1,
  },
  {
    id: 2,
    question: 'Combien de photos "après" minimum sont requises pour valider une intervention ?',
    options: ['1 photo', '2 photos', '5 photos', 'Aucune'],
    correct: 1,
  },
  {
    id: 3,
    question: 'Que faire si un voyageur est encore présent à l\'heure de l\'intervention ?',
    options: [
      'Commencer l\'intervention quand même',
      'Repartir sans prévenir',
      'Contacter immédiatement l\'admin via l\'app',
      'Attendre devant la porte sans rien faire',
    ],
    correct: 2,
  },
  {
    id: 4,
    question: 'Les codes d\'accès au logement sont visibles dans l\'app :',
    options: [
      'Dès l\'acceptation de la mission',
      '30 minutes avant l\'heure prévue',
      '24h avant',
      'Uniquement après confirmation téléphonique',
    ],
    correct: 1,
  },
  {
    id: 5,
    question: 'Que faire si vous découvrez un dégât dans le logement ?',
    options: [
      'L\'ignorer et nettoyer normalement',
      'Réparer vous-même',
      'Photographier et signaler via la checklist dégâts',
      'Appeler les pompiers',
    ],
    correct: 2,
  },
  {
    id: 6,
    question: 'Votre rémunération représente :',
    options: ['50% du prix de l\'intervention', '80% du prix de l\'intervention', '100% du prix', '70% du prix'],
    correct: 1,
  },
  {
    id: 7,
    question: 'Si vous ne pouvez pas effectuer une mission acceptée, vous devez :',
    options: [
      'Ne rien faire et ne pas y aller',
      'Refuser dans l\'app le plus tôt possible',
      'Envoyer un ami à votre place',
      'Appeler le voyageur directement',
    ],
    correct: 1,
  },
  {
    id: 8,
    question: 'La checklist d\'une intervention doit être :',
    options: [
      'Cochée partiellement, le reste n\'est pas important',
      'Remplie uniquement pour les pièces principales',
      'Complètement remplie avant de pouvoir terminer l\'intervention',
      'Optionnelle',
    ],
    correct: 2,
  },
  {
    id: 9,
    question: 'Les informations des logements (codes, adresses, données clients) sont :',
    options: [
      'Partageables avec d\'autres prestataires',
      'Strictement confidentielles',
      'Publiables sur les réseaux sociaux',
      'Transmissibles à des tiers si besoin',
    ],
    correct: 1,
  },
  {
    id: 10,
    question: 'En cas de no-show (absence non justifiée), Deltom peut :',
    options: [
      'Ne rien faire',
      'Envoyer un avertissement par email',
      'Suspendre immédiatement le compte',
      'Réduire la commission de 5%',
    ],
    correct: 2,
  },
];

export default function ProviderRegisterStep7() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = Object.keys(answers).length === QUESTIONS.length;
  const score = submitted
    ? Math.round((QUESTIONS.filter((q) => answers[q.id] === q.correct).length / QUESTIONS.length) * 100)
    : 0;
  const passed = score >= 80;

  function handleSubmit() {
    if (!allAnswered) return;
    setSubmitted(true);
  }

  function handleRetry() {
    setAnswers({});
    setSubmitted(false);
  }

  if (submitted) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 px-6 pt-6 pb-8 items-center justify-center">
          <Text className="text-6xl mb-4">{passed ? '🎉' : '😕'}</Text>
          <Text className="text-3xl font-bold text-text-primary mb-2">{score}%</Text>
          <Text className={`text-base font-semibold mb-6 ${passed ? 'text-green-600' : 'text-danger'}`}>
            {passed ? 'Certification réussie !' : 'Score insuffisant (minimum 80%)'}
          </Text>
          <Text className="text-sm text-text-secondary text-center mb-8 leading-5">
            {passed
              ? 'Bravo ! Vous avez validé la certification Deltom. Passez à l\'étape suivante.'
              : 'Vous devez obtenir au moins 80% pour continuer. Relisez la formation et réessayez.'}
          </Text>
          {passed ? (
            <TouchableOpacity className="h-14 w-full bg-primary rounded-btn items-center justify-center"
              onPress={() => router.push('/(auth)/register/provider/step-8')}>
              <Text className="text-white text-base font-semibold">Continuer</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity className="h-14 w-full bg-primary rounded-btn items-center justify-center"
              onPress={handleRetry}>
              <Text className="text-white text-base font-semibold">Réessayer</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} className="mb-8 w-11 h-11 justify-center">
          <Text className="text-2xl text-text-primary">←</Text>
        </TouchableOpacity>

        <View className="flex-row gap-1 mb-8">
          {[1,2,3,4,5,6,7,8].map((i) => (
            <View key={i} className={`flex-1 h-1 rounded-full ${i <= 7 ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </View>

        <Text className="text-2xl font-bold text-text-primary mb-1">Certification</Text>
        <Text className="text-sm text-text-secondary mb-2">Étape 7 sur 8 — {Object.keys(answers).length}/{QUESTIONS.length} réponses</Text>
        <Text className="text-xs text-text-secondary mb-8">Score minimum requis : 80%</Text>

        <View className="gap-6">
          {QUESTIONS.map((q) => (
            <View key={q.id}>
              <Text className="text-sm font-semibold text-text-primary mb-3">
                {q.id}. {q.question}
              </Text>
              <View className="gap-2">
                {q.options.map((opt, idx) => {
                  const selected = answers[q.id] === idx;
                  return (
                    <TouchableOpacity key={idx} onPress={() => setAnswers((prev) => ({ ...prev, [q.id]: idx }))}
                      className={`rounded-xl border-2 px-4 py-3 flex-row items-center gap-3 ${selected ? 'border-primary bg-primary/5' : 'border-border'}`}>
                      <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${selected ? 'border-primary' : 'border-border'}`}>
                        {selected && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </View>
                      <Text className={`text-sm flex-1 ${selected ? 'text-primary font-medium' : 'text-text-primary'}`}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          className={`h-14 rounded-btn items-center justify-center mt-8 ${allAnswered ? 'bg-primary' : 'bg-text-muted'}`}
          onPress={handleSubmit} disabled={!allAnswered}>
          <Text className="text-white text-base font-semibold">Valider mes réponses</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
