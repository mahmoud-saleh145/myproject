
export function calculateShipping(governorate) {

    const shippingRates = {
        "Cairo": 50,
        "Giza": 60,
        "Alexandria": 70,
        "Dakahlia": 80,
        "Sharqia": 80,
        "Gharbia": 80,
        "Qalyubia": 70,
        "Ismailia": 90,
        "Suez": 90,
        "Port Said": 90,
        "Luxor": 120,
        "Aswan": 130

    };


    if (shippingRates[governorate]) {
        return shippingRates[governorate];
    }


    return 100;
}
