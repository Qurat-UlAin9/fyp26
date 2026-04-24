import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { ChevronLeft, Sparkles, Calendar, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function CreateTaskScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [workload, setWorkload] = useState('Medium');

  const handleAISchedule = () => {
    if (!title.trim()) return;

    // Simulate AI breaking task into smaller steps
    const aiSubtasks = [
      { id: '1', title: `Research ${title}`, done: false },
      { id: '2', title: `Draft outline for ${title}`, done: false },
      { id: '3', title: `Execute main work`, done: false },
      { id: '4', title: `Review and Polish`, done: false },
    ];

    const newTask = {
      id: Date.now().toString(),
      title,
      deadline,
      workload,
      subtasks: aiSubtasks,
      expanded: true,
      completedRewarded: false,
      createdAt: Date.now(),
    };

    // Assuming you have access to addTask via context
    // addTask(newTask); 
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ChevronLeft color="#1E293B" /></TouchableOpacity>
        <Text style={styles.headerTitle}>New Challenge</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>WHAT IS THE GOAL?</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g., Complete assignment draft" 
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>DEADLINE</Text>
        <View style={styles.inputRow}>
          <Calendar size={20} color="#94A3B8" />
          <TextInput 
            style={styles.flexInput} 
            placeholder="YYYY-MM-DD" 
            value={deadline}
            onChangeText={setDeadline}
          />
        </View>

        <Text style={styles.label}>ENERGY LEVEL REQUIRED</Text>
        <View style={styles.workloadRow}>
          {['Low', 'Medium', 'High'].map(level => (
            <TouchableOpacity 
              key={level} 
              style={[styles.workloadBtn, workload === level && styles.workloadActive]} 
              onPress={() => setWorkload(level)}
            >
              <Text style={[styles.workloadText, workload === level && styles.workloadTextActive]}>{level}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={handleAISchedule} style={styles.aiBtnContainer}>
          <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.aiBtn}>
            <Sparkles color="white" size={20} />
            <Text style={styles.aiBtnText}>AI: Break Into Steps</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  content: { padding: 20 },
  label: { fontSize: 12, fontWeight: '800', color: '#94A3B8', marginBottom: 12, letterSpacing: 1 },
  input: { backgroundColor: 'white', padding: 16, borderRadius: 16, fontSize: 16, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24, gap: 10 },
  flexInput: { flex: 1, fontSize: 16 },
  workloadRow: { flexDirection: 'row', gap: 10, marginBottom: 40 },
  workloadBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: 'white' },
  workloadActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
  workloadText: { fontWeight: '700', color: '#64748B' },
  workloadTextActive: { color: '#6366F1' },
  aiBtn: { flexDirection: 'row', padding: 18, borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 10 },
  aiBtnText: { color: 'white', fontWeight: '800', fontSize: 16 }
});
