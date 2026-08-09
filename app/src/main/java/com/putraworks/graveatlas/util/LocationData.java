package com.putraworks.graveatlas.util;

import java.util.HashMap;
import java.util.Map;

/**
 * Static local city lists for common state/province selections.
 * Zero network calls — keeps location selection fully offline and free.
 *
 * Coverage is intentionally focused on the states already offered in
 * HomeFragment's state dropdown. Any state/country combo not listed here
 * simply gets the "Type manually..." fallback in the city spinner, so the
 * dropdown is never left empty.
 */
public class LocationData {

    private static final Map<String, String[]> CITIES = new HashMap<>();

    static {
        // Indonesia
        CITIES.put("Aceh", new String[]{"Banda Aceh", "Lhokseumawe", "Langsa", "Sabang", "Meulaboh"});
        CITIES.put("Bali", new String[]{"Denpasar", "Ubud", "Kuta", "Singaraja", "Gianyar"});
        CITIES.put("Banten", new String[]{"Serang", "Tangerang", "Cilegon", "South Tangerang"});
        CITIES.put("DKI Jakarta", new String[]{"Central Jakarta", "North Jakarta", "South Jakarta", "East Jakarta", "West Jakarta"});
        CITIES.put("Jawa Barat", new String[]{"Bandung", "Bekasi", "Bogor", "Depok", "Cimahi"});
        CITIES.put("Jawa Tengah", new String[]{"Semarang", "Surakarta", "Magelang", "Salatiga", "Pekalongan"});
        CITIES.put("Jawa Timur", new String[]{"Surabaya", "Malang", "Kediri", "Madiun", "Batu"});
        CITIES.put("Sumatera Utara", new String[]{"Medan", "Binjai", "Pematangsiantar", "Tebing Tinggi"});
        CITIES.put("Sumatera Barat", new String[]{"Padang", "Bukittinggi", "Payakumbuh", "Solok"});
        CITIES.put("Riau", new String[]{"Pekanbaru", "Dumai"});
        CITIES.put("Kalimantan Barat", new String[]{"Pontianak", "Singkawang"});
        CITIES.put("Kalimantan Timur", new String[]{"Samarinda", "Balikpapan", "Bontang"});
        CITIES.put("Sulawesi Selatan", new String[]{"Makassar", "Parepare", "Palopo"});
        CITIES.put("Papua", new String[]{"Jayapura"});

        // Malaysia
        CITIES.put("Johor", new String[]{"Johor Bahru", "Batu Pahat", "Muar", "Kluang"});
        CITIES.put("Kedah", new String[]{"Alor Setar", "Sungai Petani", "Kulim"});
        CITIES.put("Kelantan", new String[]{"Kota Bharu"});
        CITIES.put("Kuala Lumpur", new String[]{"Kuala Lumpur"});
        CITIES.put("Labuan", new String[]{"Victoria"});
        CITIES.put("Melaka", new String[]{"Melaka City", "Alor Gajah"});
        CITIES.put("Negeri Sembilan", new String[]{"Seremban", "Port Dickson"});
        CITIES.put("Pahang", new String[]{"Kuantan", "Temerloh", "Bentong"});
        CITIES.put("Penang", new String[]{"George Town", "Butterworth", "Bukit Mertajam"});
        CITIES.put("Perak", new String[]{"Ipoh", "Taiping", "Teluk Intan"});
        CITIES.put("Perlis", new String[]{"Kangar"});
        CITIES.put("Putrajaya", new String[]{"Putrajaya"});
        CITIES.put("Sabah", new String[]{"Kota Kinabalu", "Sandakan", "Tawau"});
        CITIES.put("Sarawak", new String[]{"Kuching", "Miri", "Sibu", "Bintulu"});
        CITIES.put("Selangor", new String[]{"Shah Alam", "Petaling Jaya", "Klang", "Subang Jaya", "Kajang"});
        CITIES.put("Terengganu", new String[]{"Kuala Terengganu"});

        // Thailand
        CITIES.put("Bangkok", new String[]{"Bangkok"});
        CITIES.put("Chiang Mai", new String[]{"Chiang Mai City"});
        CITIES.put("Chonburi", new String[]{"Pattaya", "Chonburi City"});
        CITIES.put("Phuket", new String[]{"Phuket Town", "Patong"});
        CITIES.put("Songkhla", new String[]{"Hat Yai", "Songkhla City"});
        CITIES.put("Nakhon Ratchasima", new String[]{"Nakhon Ratchasima City"});

        // Philippines
        CITIES.put("Metro Manila", new String[]{"Manila", "Quezon City", "Makati", "Pasig", "Taguig"});
        CITIES.put("Cebu", new String[]{"Cebu City", "Lapu-Lapu", "Mandaue"});
        CITIES.put("Davao", new String[]{"Davao City"});
        CITIES.put("Iloilo", new String[]{"Iloilo City"});
        CITIES.put("Bulacan", new String[]{"Malolos", "Meycauayan"});
        CITIES.put("Cavite", new String[]{"Dasmariñas", "Bacoor", "Imus"});
        CITIES.put("Laguna", new String[]{"Santa Rosa", "Calamba", "San Pablo"});

        // Australia
        CITIES.put("New South Wales", new String[]{"Sydney", "Newcastle", "Wollongong"});
        CITIES.put("Victoria", new String[]{"Melbourne", "Geelong", "Ballarat"});
        CITIES.put("Queensland", new String[]{"Brisbane", "Gold Coast", "Cairns"});
        CITIES.put("Western Australia", new String[]{"Perth", "Fremantle"});
        CITIES.put("South Australia", new String[]{"Adelaide"});
        CITIES.put("Tasmania", new String[]{"Hobart", "Launceston"});
        CITIES.put("Australian Capital Territory", new String[]{"Canberra"});
        CITIES.put("Northern Territory", new String[]{"Darwin", "Alice Springs"});

        // United Kingdom
        CITIES.put("England", new String[]{"London", "Manchester", "Birmingham", "Liverpool", "Leeds"});
        CITIES.put("Scotland", new String[]{"Edinburgh", "Glasgow", "Aberdeen"});
        CITIES.put("Wales", new String[]{"Cardiff", "Swansea"});
        CITIES.put("Northern Ireland", new String[]{"Belfast"});

        // India
        CITIES.put("Andhra Pradesh", new String[]{"Visakhapatnam", "Vijayawada"});
        CITIES.put("Delhi", new String[]{"New Delhi"});
        CITIES.put("Goa", new String[]{"Panaji", "Margao"});
        CITIES.put("Gujarat", new String[]{"Ahmedabad", "Surat", "Vadodara"});
        CITIES.put("Karnataka", new String[]{"Bengaluru", "Mysuru", "Mangaluru"});
        CITIES.put("Kerala", new String[]{"Kochi", "Thiruvananthapuram", "Kozhikode"});
        CITIES.put("Maharashtra", new String[]{"Mumbai", "Pune", "Nagpur"});
        CITIES.put("Tamil Nadu", new String[]{"Chennai", "Coimbatore", "Madurai"});
        CITIES.put("Telangana", new String[]{"Hyderabad", "Warangal"});
        CITIES.put("West Bengal", new String[]{"Kolkata", "Howrah"});
        CITIES.put("Uttar Pradesh", new String[]{"Lucknow", "Kanpur", "Agra"});

        // US (top few states with common cities — rest fall back to manual entry)
        CITIES.put("California", new String[]{"Los Angeles", "San Francisco", "San Diego", "Sacramento"});
        CITIES.put("New York", new String[]{"New York City", "Buffalo", "Albany"});
        CITIES.put("Texas", new String[]{"Houston", "Austin", "Dallas", "San Antonio"});
        CITIES.put("Florida", new String[]{"Miami", "Orlando", "Tampa", "Jacksonville"});
        CITIES.put("Illinois", new String[]{"Chicago", "Springfield"});
        CITIES.put("Washington", new String[]{"Seattle", "Spokane"});

        // City-states — "city" here means district/area since there's no state level
        CITIES.put("Singapore", new String[]{"Central Region", "Ang Mo Kio", "Bedok", "Bishan", "Jurong East",
                "Tampines", "Woodlands", "Yishun", "Punggol", "Sengkang"});
        CITIES.put("Monaco", new String[]{"Monaco-Ville", "La Condamine", "Monte Carlo", "Fontvieille"});
        CITIES.put("Vatican City", new String[]{"Vatican City"});
        CITIES.put("Hong Kong", new String[]{"Hong Kong Island", "Kowloon", "New Territories"});
        CITIES.put("Macau", new String[]{"Macau Peninsula", "Taipa", "Coloane"});
        CITIES.put("Gibraltar", new String[]{"Gibraltar"});
    }

    /** Returns known cities for a state/province, or null if not covered locally. */
    public static String[] getCitiesForState(String state) {
        return CITIES.get(state);
    }

    /** Returns known "city" options for a city-state country (keyed the same way as states). */
    public static String[] getCitiesForCountry(String country) {
        return CITIES.get(country);
    }
}
