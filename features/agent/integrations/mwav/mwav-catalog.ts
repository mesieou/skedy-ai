/**
 * Man With A Van - Item Catalog
 *
 * Hardcoded catalog for Phase 1 demo
 * Future: Replace with API call to MWAV endpoint
 */

import type { MWAVCatalog } from './mwav-types';

export const MWAV_ITEMS_CATALOG: MWAVCatalog = {
  metadata: {
    version: '1.0.0',
    last_updated: '2024-10-17',
    total_items: 150
  },
  categories: [
    {
      name: "Beds",
      items: [
        "Single Mattress",
        "King Single Mattress",
        "Single Ensemble Base",
        "Single Frame & Slats (Taken Apart)",
        "Single Base with Built in Drawers",
        "Double Mattress",
        "Double Ensemble Base",
        "Double Frame & Slats (Taken Apart)",
        "Double Base with Built in Drawers",
        "Queen Mattress",
        "Queen Ensemble Base",
        "Queen Frame & Slats (Taken Apart)",
        "Queen Base with Built in Drawers",
        "King Mattress",
        "King Ensemble Base (2 pieces)",
        "King Frame & Slats (Taken Apart)",
        "King Base with built in drawers",
        "Bedhead - Large",
        "Bedhead - Built in side drawers",
        "Bunk Bed Frame (Taken Apart)"
      ]
    },
    {
      name: "Tables",
      items: [
        "Table - Kitchen/Dining 4 Seater",
        "Table - Kitchen/Dining 6 Seater",
        "Table - Kitchen/Dining 8 Seater",
        "Table - Kitchen/Dining 10 Seater",
        "Outdoor Small Cafe Table",
        "Outdoor Table - 6 Seater"
      ]
    },
    {
      name: "Chairs",
      items: [
        "Bench Seat",
        "Chair (Kitchen/Dining)",
        "Folding Chair",
        "High Chair",
        "Stool",
        "Outdoor Chair",
        "Outdoor 2 Seat Sofa",
        "Sun Lounge"
      ]
    },
    {
      name: "Clothing Storage",
      items: [
        "Chest of Drawers - Small",
        "Chest of Drawers - Medium",
        "Chest of Drawers - Large",
        "Dressing Table",
        "Dressing Table & Mirror",
        "Tallboy",
        "Clothes Rack (Empty)",
        "Clothes Rack (Full)",
        "Wardrobe (Small)",
        "Wardrobe (Medium)",
        "Wardrobe (Large)"
      ]
    },
    {
      name: "Bookcase/Display Case",
      items: [
        "Shelving Unit",
        "Bookcase - 2x2 Expedit/Kallax",
        "Bookcase - 4x2 Expedit/Kallax",
        "Bookcase - 4x4 Expedit/Kallax",
        "Bookcase - 5x5 Expedit/Kallax",
        "Bookcase - Regular",
        "Bookcase - Large/Square",
        "Bookcase - Small",
        "Display Cabinet (Small)",
        "Display Cabinet (Medium)",
        "Display Cabinet (Large)"
      ]
    },
    {
      name: "Sofas",
      items: [
        "Futon Sofa",
        "Chaise",
        "Sofa - 2 Seater/Bed",
        "Sofa - 3 Seater/Bed",
        "Sofa - L Shaped",
        "Sofa - L Shaped XL size"
      ]
    },
    {
      name: "TV Cabinets",
      items: [
        "TV Cabinet - Medium Low",
        "TV Cabinet - Long Low",
        "TV Cabinet - Large Square"
      ]
    },
    {
      name: "Fridges",
      items: [
        "Bar Fridge",
        "Small Fridge",
        "Regular Fridge",
        "Large Fridge",
        "Double/French Door Fridge",
        "Chest Freezer",
        "Tall Commercial Fridge"
      ]
    },
    {
      name: "Barbeques",
      items: [
        "BBQ - Small (NO GAS BTL)",
        "BBQ - Medium (NO GAS BTL)",
        "BBQ - Large (NO GAS BTL)"
      ]
    },
    {
      name: "Desks",
      items: [
        "Desk (Small)",
        "Desk (Medium)",
        "Desk (Large)",
        "Drawers - Under Desk"
      ]
    },
    {
      name: "Cupboards",
      items: [
        "Display Cabinet (Small)",
        "Display Cabinet (Medium)",
        "Display Cabinet (Large)",
        "Cupboard - Small",
        "Cupboard - Medium",
        "Cupboard - Large"
      ]
    },
    {
      name: "Filing Cabinets",
      items: [
        "Filing Cabinet - 2 Drawer",
        "Filing Cabinet - 3 Drawer",
        "Filing Cabinet - 4 Drawer"
      ]
    },
    {
      name: "Pallet",
      items: [
        "Pallet (Empty)",
        "Pallet (Quarter Load)",
        "Pallet (Half Load)",
        "Pallet (Full)"
      ]
    },
    {
      name: "Pot Plants",
      items: [
        "Pot Plants - Small",
        "Pot Plants - Medium",
        "Pot Plants - Large"
      ]
    },
    {
      name: "Coffee Tables",
      items: [
        "Coffee Table (Small)",
        "Coffee Table (Medium)",
        "Coffee Table (Large)"
      ]
    },
    {
      name: "Musical Instruments",
      items: [
        "Guitar",
        "Organ"
      ]
    },
    {
      name: "Televisions",
      items: [
        "TV - Medium LCD/Plasma in box",
        "TV - Large LCD/Plasma in box",
        "TV - Extra Large LCD in box"
      ]
    },
    {
      name: "Sport/Recreation Equipment",
      items: [
        "Trampoline",
        "Basketball Hoop",
        "Exercise Bike",
        "Treadmill/Cross Trainer",
        "Golf Bag",
        "Skis/Snowboard",
        "Surfboard",
        "Table Tennis"
      ]
    },
    {
      name: "Boxes & Storage",
      items: [
        "Box - Small",
        "Box - Archive",
        "Box - Large",
        "Box - Large Plastic Tub/Bin",
        "Box - Port-a-Robe",
        "Small Bag - Supermarket",
        "Large Bag - Stripey",
        "Suitcase",
        "Storage Trunk"
      ]
    },
    {
      name: "Misc.",
      items: [
        "Bedside Table/Drawers",
        "Change Table - Baby",
        "Cot - Baby (Taken Apart)",
        "Armchair",
        "Buffet",
        "Buffet & Hutch (Large)",
        "Ottoman - Chaise",
        "Recliner",
        "Bean Bag",
        "Sideboard",
        "Hall Table",
        "Coat Stand",
        "Hat Stand",
        "Carpets & Rugs",
        "Stereo/Speakers",
        "Tea Trolley",
        "Bar",
        "Lamp - Bedside",
        "Lamp - Tall, Floor",
        "Mirror",
        "Side Table",
        "Trestle Table",
        "Dropside Table",
        "Bureau",
        "Kitchen Island Bench"
      ]
    },
    {
      name: "Appliances",
      items: [
        "Air Conditioner",
        "Coffee Machine (Domestic)",
        "Microwave",
        "Washing Machine",
        "Dryer",
        "Dishwasher",
        "Heater",
        "Fan",
        "Vacuum Cleaner",
        "Ironing Board",
        "Laundry Basket/Bag"
      ]
    },
    {
      name: "Outside",
      items: [
        "Outdoor Umbrella",
        "Outdoor Heater (NO GAS BTL)",
        "Garden Tools (misc)",
        "Dog Kennel",
        "Esky",
        "Ladder",
        "Lawn Mower",
        "Wheel Barrow",
        "Whipper Snipper",
        "Workbench"
      ]
    },
    {
      name: "Office",
      items: [
        "Chair (Office)",
        "Desk Return",
        "Reception Desk",
        "Plan Drawers",
        "Wall Unit",
        "Boardroom Table",
        "Whiteboard",
        "Room Divider",
        "Printer (Small Household)",
        "Monitor",
        "Computer"
      ]
    },
    {
      name: "Alternate",
      items: [
        "Bicycle",
        "Pictures/Paintings",
        "Sewing Machine",
        "Sewing Machine Table",
        "Child's Ride-On Toy",
        "Pram",
        "Kids table and chairs",
        "Barrel",
        "Taxibox load/unload",
        "Self Storage Facility Unit (Full)"
      ]
    },
    {
      name: "Not Available",
      items: [
        "Billiards/Pool Table"
      ]
    }
  ]
};

/**
 * Helper function to flatten catalog for fuzzy search
 * Returns all items with their category info
 */
export function getFlattenedCatalog() {
  const items: Array<{ item_name: string; category: string }> = [];

  for (const category of MWAV_ITEMS_CATALOG.categories) {
    for (const item of category.items) {
      items.push({
        item_name: item,
        category: category.name
      });
    }
  }

  return items;
}

/**
 * Helper function to find item category
 */
export function getItemCategory(itemName: string): string | undefined {
  for (const category of MWAV_ITEMS_CATALOG.categories) {
    if (category.items.includes(itemName)) {
      return category.name;
    }
  }
  return undefined;
}
