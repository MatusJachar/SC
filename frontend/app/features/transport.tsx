import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

const GPS_LAT = 48.9998;
const GPS_LNG = 20.7680;
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${GPS_LAT},${GPS_LNG}`;

export default function TransportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Transport</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.mainTitle}>How to get to Spi{'\u0161'} Castle</Text>

        {/* GPS */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={22} color={Colors.accent} />
            <Text style={styles.cardTitle}>GPS Coordinates</Text>
          </View>
          <Text style={styles.gpsCoords}>48{'\u00B0'}59.98956'N, 20{'\u00B0'}46.08196'E</Text>
          <Pressable style={styles.mapButton} onPress={() => Linking.openURL(MAPS_URL)}>
            <Ionicons name="map" size={18} color="#fff" />
            <Text style={styles.mapButtonText}>Open in Google Maps</Text>
          </Pressable>
        </View>

        {/* By Car */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="car" size={22} color="#4CAF50" />
            <Text style={styles.cardTitle}>By Car</Text>
          </View>
          <Text style={styles.cardText}>
            The easiest way to get to Spi{'\u0161'} Castle is by car (parking lot directly under the castle) or by bus to Spi{'\u0161'}sk{'\u00E9'} Podhradie and from there on foot.
          </Text>
          <Text style={styles.cardDetail}>
            <Text style={styles.bold}>Route: </Text>
            From the D1 highway, turn towards Levo{'\u010D'}a and then towards Spi{'\u0161'}sk{'\u00E9'} Podhradie. Approximately 40 km from Poprad, approximately 25 km from Spi{'\u0161'}sk{'\u00E1'} Nov{'\u00E1'} Ves.
          </Text>
          <Text style={styles.cardDetail}>
            <Text style={styles.bold}>Parking: </Text>
            There is an asphalt road leading to the parking lot right below the castle. It can be full during high season, in which case you will have to park on the side of the road.
          </Text>
        </View>

        {/* Public Transport */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bus" size={22} color="#FF9800" />
            <Text style={styles.cardTitle}>Public Transport</Text>
          </View>
          <Text style={styles.subhead}>By bus:</Text>
          <Text style={styles.cardText}>
            Take a bus to Spi{'\u0161'}sk{'\u00E9'} Podhradie. From there it is about a 30-45 minute walk to the castle.
          </Text>
          <Text style={styles.subhead}>By train:</Text>
          <Text style={styles.cardText}>
            From Poprad or Spi{'\u0161'}sk{'\u00E1'} Nov{'\u00E1'} Ves take a train to Spi{'\u0161'}sk{'\u00E9'} Vlachy and change to Spi{'\u0161'}sk{'\u00E9'} Podhradie. Please note that trains do not have to wait for each other. The train to Spi{'\u0161'}sk{'\u00E9'} Podhradie only runs during summer tourist season.
          </Text>
          <Text style={styles.subhead}>By tourist train:</Text>
          <Text style={styles.cardText}>
            A tourist train runs from the bus station in Spi{'\u0161'}sk{'\u00E9'} Podhradie directly to the castle during the season. Check the timetable in advance.
          </Text>
        </View>

        {/* On Foot */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="walk" size={22} color="#9C27B0" />
            <Text style={styles.cardTitle}>On Foot</Text>
          </View>
          <Text style={styles.cardText}>
            From Spi{'\u0161'}sk{'\u00E9'} Podhradie: From the bus station it is about 30-45 minutes walk to the castle along the hiking trail. From the train station it is about 20 minutes.
          </Text>
        </View>

        {/* Transport & Airport Lift */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="airplane" size={22} color="#E91E63" />
            <Text style={styles.cardTitle}>Transport & Airport Lift</Text>
          </View>
          <Text style={styles.cardText}>
            Need a ride to the airport or city? We offer transport services to:
          </Text>
          <Text style={styles.cardDetail}>
            {'\u2022'} Poprad Airport (Tatry Airport){'\n'}{'\u2022'} Ko{'\u0161'}ice International Airport{'\n'}{'\u2022'} Pre{'\u0161'}ov city{'\n'}{'\u2022'} Spi{'\u0161'}sk{'\u00E1'} Nov{'\u00E1'} Ves, Poprad and surroundings
          </Text>
          <Pressable style={styles.phoneButton} onPress={() => Linking.openURL('tel:0944376007')}>
            <Ionicons name="call" size={16} color="#fff" />
            <Text style={styles.phoneButtonText}>0944 376 007</Text>
          </Pressable>
        </View>

        {/* Personal Tour Guide */}
        <View style={[styles.card, { borderColor: '#D4A017', borderWidth: 1 }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="person" size={22} color="#D4A017" />
            <Text style={[styles.cardTitle, { color: '#D4A017' }]}>Personal Tour Guide</Text>
          </View>
          <Text style={styles.cardText}>
            Discover more of the region and nature with a personal tour guide. Explore the hidden gems of Spi{'\u0161'} region, hiking trails, nearby castles, caves, and authentic Slovak countryside.
          </Text>
          <Text style={styles.cardDetail}>
            {'\u2022'} Guided tours of Spi{'\u0161'} Castle and surroundings{'\n'}{'\u2022'} Nature & hiking excursions{'\n'}{'\u2022'} Regional sightseeing (Levo{'\u010D'}a, Slovak Paradise, High Tatras){'\n'}{'\u2022'} Custom itineraries available
          </Text>
          <Pressable style={[styles.phoneButton, { backgroundColor: '#D4A017' }]} onPress={() => Linking.openURL('tel:0944376007')}>
            <Ionicons name="call" size={16} color="#fff" />
            <Text style={styles.phoneButtonText}>0944 376 007</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  content: { paddingHorizontal: 16 },
  mainTitle: { fontSize: 20, fontWeight: '800', color: Colors.text.primary, textAlign: 'center', marginBottom: 20, lineHeight: 28 },
  card: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary },
  cardText: { fontSize: 13, color: Colors.text.secondary, lineHeight: 21 },
  cardDetail: { fontSize: 13, color: Colors.text.secondary, lineHeight: 21, marginTop: 8 },
  subhead: { fontSize: 14, fontWeight: '600', color: Colors.text.primary, marginTop: 8, marginBottom: 2 },
  bold: { fontWeight: '700', color: Colors.text.primary },
  gpsCoords: { fontSize: 14, color: Colors.text.secondary, fontFamily: 'monospace', marginBottom: 12 },
  mapButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4285F4', borderRadius: 10, paddingVertical: 10, gap: 8 },
  mapButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  phoneButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E91E63', borderRadius: 10, paddingVertical: 10, marginTop: 10, gap: 8 },
  phoneButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
