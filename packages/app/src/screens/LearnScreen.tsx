import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  GLOSSARY,
  LEVELS,
  PATH,
  glossaryFor,
  lessonById,
  levelStatus,
  markLesson,
  nextStep,
  recordQuiz,
  searchGlossary,
} from '@trading/content';
import type { Lesson, Progress, Quiz } from '@trading/content';
import { quizFeedback } from '@trading/tutor';
import { AskPanel } from '../tutor/AskPanel';
import type { TutorEnv } from '../tutor/run';
import { loadProgress, saveProgress } from '../learn/progressStore';
import type { KeyValueStore } from '../store/kv';
import { Button } from '../ui/Button';
import { CoachHint } from '../ui/CoachHint';
import { MarkdownView } from '../ui/MarkdownView';
import { Note, Row, Section, colors } from '../ui/Section';
import { TabStrip } from '../ui/TabStrip';

type View_ = { v: 'path' } | { v: 'lesson'; id: string } | { v: 'quiz'; id: string };
const TABS = [
  ['path', 'Path'],
  ['glossary', 'Glossary'],
] as const;

function LessonView(props: { lesson: Lesson; done: boolean; onToggle: () => void; onBack: () => void }) {
  const { lesson } = props;
  const terms = glossaryFor(lesson.id);
  return (
    <View testID="lesson-view">
      <Button label="Back to the path" quiet onPress={props.onBack} testID="lesson-back" />
      <Text style={styles.title}>{lesson.title}</Text>
      <Note>{`${lesson.source}. Facts checked ${lesson.factsAsOf}.${lesson.reviewed ? '' : ' Draft: not yet reviewed by the owner.'}`}</Note>
      <View style={styles.gap} />
      <MarkdownView blocks={lesson.blocks} />
      {terms.length > 0 ? (
        <Section title="Words in this lesson">
          {terms.map((t) => (
            <Row key={t.term} label={t.term} value={t.meaning} />
          ))}
        </Section>
      ) : null}
      <Button label={props.done ? 'Done. Mark as not done' : 'Mark this lesson as done'} onPress={props.onToggle} testID="lesson-done" quiet={props.done} />
    </View>
  );
}

function QuizView(props: { env: TutorEnv; quiz: Quiz; onFinish: (marks: Record<string, boolean>) => void; onBack: () => void }) {
  const { quiz } = props;
  const [at, setAt] = useState(0);
  const [shown, setShown] = useState(false);
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const q = quiz.questions[at];
  if (q === undefined) return null;
  const mark = (right: boolean) => {
    const next = { ...marks, [q.id]: right };
    setMarks(next);
    setShown(false);
    if (at + 1 >= quiz.questions.length) props.onFinish(next);
    else setAt(at + 1);
  };
  return (
    <View testID="quiz-view">
      <Button label="Back to the path" quiet onPress={props.onBack} testID="quiz-back" />
      <Text style={styles.title}>{quiz.title}</Text>
      <Note>{`Question ${String(at + 1)} of ${String(quiz.questions.length)}. Think of your answer first, then check it and mark yourself honestly.`}</Note>
      <Text style={styles.question} testID="quiz-question">{q.question}</Text>
      {shown ? (
        <>
          <Text style={styles.answer} testID="quiz-answer">{q.answer}</Text>
          <AskPanel env={props.env} label="Explain this another way" testID="quiz-explain" build={() => quizFeedback({ question: q.question, modelAnswer: q.answer, lessonIds: q.lessons })} />
          <Button label="I had it right" onPress={() => mark(true)} testID="quiz-right" />
          <View style={styles.gap} />
          <Button label="Not yet" quiet onPress={() => mark(false)} testID="quiz-wrong" />
        </>
      ) : (
        <Button label="Show the answer" onPress={() => setShown(true)} testID="quiz-show" />
      )}
    </View>
  );
}

function Path(props: { progress: Progress; onOpen: (v: View_) => void }) {
  const { progress } = props;
  const next = nextStep(progress, PATH);
  const nextTitle = next.kind === 'lesson' ? (lessonById(next.id)?.title ?? '') : next.kind === 'quiz' ? 'the self-check' : '';
  return (
    <>
      <Section title="Next step">
        {next.kind === 'done' ? (
          <Note>All levels are done. Practise what you learned, and come back to any lesson.</Note>
        ) : (
          <Button label={`Continue: ${nextTitle}`} onPress={() => props.onOpen({ v: next.kind, id: next.id })} testID="learn-next" />
        )}
      </Section>
      {LEVELS.map((l) => {
        const st = levelStatus(progress, l.lessons.map((x) => x.id), l.quiz?.id ?? null);
        return (
          <Section key={l.level} title={l.title}>
            <Note>{`${String(st.lessonsDone)} of ${String(st.lessonsTotal)} lessons done${st.complete ? '. Level complete.' : ''}`}</Note>
            {l.lessons.map((x) => (
              <Pressable key={x.id} accessibilityRole="button" onPress={() => props.onOpen({ v: 'lesson', id: x.id })} style={styles.tapRow} testID={`lesson-${x.id}`}>
                <Row label={x.title} value={progress.lessons[x.id] !== undefined ? 'done' : ''} />
              </Pressable>
            ))}
            {l.quiz !== null ? (
              <Pressable accessibilityRole="button" onPress={() => props.onOpen({ v: 'quiz', id: l.quiz?.id ?? '' })} style={styles.tapRow} testID={`quiz-${l.quiz.id}`}>
                <Row label="Self-check" value={scoreText(progress, l.quiz.id)} />
              </Pressable>
            ) : null}
          </Section>
        );
      })}
    </>
  );
}

const scoreText = (p: Progress, id: string): string => {
  const r = p.quizzes[id];
  return r === undefined ? '' : `${String(r.right)} of ${String(r.total)}`;
};

function GlossaryView() {
  const [q, setQ] = useState('');
  const found = searchGlossary(q);
  return (
    <View testID="glossary-view">
      <TextInput value={q} onChangeText={setQ} placeholder={`Search ${String(GLOSSARY.length)} terms`} style={styles.input} accessibilityLabel="Search the glossary" testID="glossary-search" />
      {found.length === 0 ? <Note>Nothing matches.</Note> : null}
      {found.map((g) => (
        <Row key={g.term} label={g.term} value={g.meaning} />
      ))}
    </View>
  );
}

function PathTab(props: { env: TutorEnv; progress: Progress; view: View_; setView: (v: View_) => void; save: (p: Progress) => void; now: () => number }) {
  const { progress, view, now } = props;
  const lesson = view.v === 'lesson' ? lessonById(view.id) : null;
  const quiz = view.v === 'quiz' ? (LEVELS.find((l) => l.quiz?.id === view.id)?.quiz ?? null) : null;
  const back = () => props.setView({ v: 'path' });
  if (lesson !== null)
    return <LessonView lesson={lesson} done={progress.lessons[lesson.id] !== undefined} onBack={back} onToggle={() => props.save(markLesson(progress, lesson.id, progress.lessons[lesson.id] === undefined, now()))} />;
  if (quiz !== null)
    return (
      <QuizView
        env={props.env}
        quiz={quiz}
        onBack={back}
        onFinish={(marks) => {
          props.save(recordQuiz(progress, quiz.id, quiz.questions.map((x) => x.id), marks, now()));
          back();
        }}
      />
    );
  return <Path progress={progress} onOpen={props.setView} />;
}

export function LearnScreen({ kv, now, env }: { kv: KeyValueStore; now: () => number; env: TutorEnv }) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('path');
  const [view, setView] = useState<View_>({ v: 'path' });
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => {
    let live = true;
    void loadProgress(kv).then((p) => live && setProgress(p));
    return () => {
      live = false;
    };
  }, [kv]);
  const save = useCallback(
    (p: Progress) => {
      setProgress(p);
      void saveProgress(kv, p, now());
    },
    [kv, now],
  );
  if (progress === null)
    return (
      <View style={styles.page} testID="learn-screen">
        <Note>Loading...</Note>
      </View>
    );
  return (
    <ScrollView contentContainerStyle={styles.page} testID="learn-screen">
      <TabStrip tabs={TABS} active={tab} onSelect={(t) => { setTab(t); setView({ v: 'path' }); }} small />
      <CoachHint screen="learn" />
      {tab === 'glossary' ? <GlossaryView /> : <PathTab env={env} progress={progress} view={view} setView={setView} save={save} now={now} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 12 },
  question: { fontSize: 17, color: colors.text, marginVertical: 16, lineHeight: 24 },
  answer: { fontSize: 16, color: colors.text, backgroundColor: '#eef5ff', padding: 12, borderRadius: 8, marginBottom: 16 },
  gap: { height: 8 },
  tapRow: { minHeight: 44, justifyContent: 'center' },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 6, padding: 10, minHeight: 44, color: colors.text, marginBottom: 8 },
});
