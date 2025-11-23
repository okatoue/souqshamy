import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';

export default function TestSupabase() {
  const [categories, setCategories] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);

  const testConnection = async () => {
    try {
      // Test fetching categories
      const { data, error } = await supabase
        .from('categories')
        .select('*');
      
      if (error) throw error;
      
      setCategories(data || []);
      setConnected(true);
      console.log('✅ Supabase connected! Categories:', data);
    } catch (error) {
      console.error('❌ Connection failed:', error);
      setConnected(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>
        Supabase Status: {connected ? '✅ Connected' : '❌ Not connected'}
      </Text>
      
      <Text style={{ fontSize: 16, marginBottom: 10 }}>
        Categories: {categories.length}
      </Text>
      
      {categories.map(cat => (
        <Text key={cat.id}>- {cat.name}</Text>
      ))}
      
      <Button title="Test Again" onPress={testConnection} />
    </View>
  );
}