import { useEffect, useMemo, useState } from "react";
import { MACHINES } from "../config";

const DEFAULT_MASTER_DATA = [
  {
    machine: "NF-19B",
    partNumber: "12BAD-1032X-001",
    rpm: 70,
    pcsPerRev: 1,
    customer: "PT. ARGATAMA MULTI AGUNG",
    sizePart: "M10X32",
    picShift1: "Iis Iskandar",
    picShift2: "Fiki Firmansyah",
    partOptions: [
      { partNo: "12BAD-1032X-001", customer: "PT. ARGATAMA MULTI AGUNG", sizePart: "M10X32", rpm: 70 },
      { partNo: "50251-TSAA-0030-H1", customer: "PT. FTECH INDONESIA", sizePart: "20 x 14 x 27.2", rpm: 70 },
      { partNo: "X4609532", customer: "PT. HITACHI CONSTRUCTIONS MACHINERY INDONESIA", sizePart: "10 x 15.5", rpm: 70 },
      { partNo: "8528-092-00", customer: "PT. PROGRESS TOYO INDONESIA", sizePart: "10 x 14", rpm: 70 },
      { partNo: "8528-192-00", customer: "PT. PROGRESS TOYO INDONESIA", sizePart: "10 x 14", rpm: 70 },
      { partNo: "8528-292-00", customer: "PT. PROGRESS TOYO INDONESIA", sizePart: "10 x 14", rpm: 70 },
      { partNo: "8528-392-00", customer: "PT. PROGRESS TOYO INDONESIA", sizePart: "10 x 14", rpm: 70 },
      { partNo: "730409-5370-A", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "20 x 11.5 x 25", rpm: 70 },
      { partNo: "730409-5390", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "20 x 11.5 x 15", rpm: 70 },
      { partNo: "730409-5430", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "20 x 11.5 x 13", rpm: 70 },
      { partNo: "730409-5690", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "20 x 11.5 x 13", rpm: 70 },
      { partNo: "90101-KWW-6400", customer: "PT. ARGATAMA MULTI AGUNG", sizePart: "M10X32", rpm: 70 },
    ],
  },
  {
    machine: "CBP-105",
    partNumber: "8572-010-00",
    rpm: 50,
    pcsPerRev: 1,
    customer: "Progress Toyo Ind",
    sizePart: "6 x 10",
    picShift1: "Achmad Syaiful",
    picShift2: "Yossi Tera P",
    partOptions: [
      { partNo: "8572-010-00", customer: "Progress Toyo Ind", sizePart: "6 x 10", rpm: 50 },
      { partNo: "1559-018-00", customer: "Progress Toyo Ind", sizePart: "5 x 15", rpm: 40 },
      { partNo: "7J9720-0140", customer: "Tokai Rika Safety Ind", sizePart: "7 x 47,4", rpm: 60 },
      { partNo: "82810A67LAOAC", customer: "Sankeikid Manutec Ind", sizePart: "4 x 89", rpm: 45 },
      { partNo: "3C315-G9440", customer: "Murakami Delloyd Ind", sizePart: "6 x 12,2", rpm: 50 },
      { partNo: "44548-BZ040", customer: "Meidoh Ind", sizePart: "6 x 9,5", rpm: 30 },
      { partNo: "983951-01009-C", customer: "Kojima Ind", sizePart: "7,1 x 11,1 x 6,2", rpm: 45 },
      { partNo: "000Y02-0310-Y", customer: "Ichikoh Indonesia", sizePart: "M5 x 31,5", rpm: 40 },
      { partNo: "000Y02-0340-Y", customer: "Ichikoh Indonesia", sizePart: "M5 x 38", rpm: 50 },
      { partNo: "90145 - TG1 - T000", customer: "F.Tech Ind", sizePart: "M6 X 25", rpm: 50 },
      { partNo: "983951-01006-C", customer: "Aisin Ind", sizePart: "8,5 x 11,8 x 12,8", rpm: 50 },
      { partNo: "983951-01008-B", customer: "Aisin Ind", sizePart: "6,9 x 11,1 x 15", rpm: 45 },
      { partNo: "983951-01010-B", customer: "Aisin Ind", sizePart: "8,5 x 11,1 x 17", rpm: 45 },
      { partNo: "72283-B1020", customer: "Fuji Seat Indonesia", sizePart: "5X39,5", rpm: 45 },
      { partNo: "009M2-3230", customer: "Ichikoh Indonesia", sizePart: "M5X38", rpm: 50 },
      { partNo: "72283-B1020-P251", customer: "Fuji Seat Indonesia", sizePart: "5X39,5", rpm: 50 },
      { partNo: "93900-03042", customer: "Ind Koito", sizePart: "M5X25", rpm: 50 },
      { partNo: "A6242-885-00", customer: "PT. MITSUBA INDONESIA", sizePart: "M4x8", rpm: 40 },
      { partNo: "91910-05353-00", customer: "PT. INDONESIA KOITO", sizePart: "5 x 45", rpm: 40 },
      { partNo: "416221-10480", customer: "Aisin Ind", sizePart: "7,47 x 90,2", rpm: 45 },
    ],
  },
  {
    machine: "YDP-136",
    partNumber: "A6242-885-00",
    rpm: 55,
    pcsPerRev: 1,
    customer: "PT. MITSUBA INDONESIA",
    sizePart: "M4x8",
    picShift1: "Iis Iskandar",
    picShift2: "Fiki Firmansyah",
    partOptions: [
      { partNo: "A6242-885-00", customer: "PT. MITSUBA INDONESIA", sizePart: "M4x8", rpm: 55 },
    ],
  },
  {
    machine: "CBP-136",
    partNumber: "A0035-18083-00-A",
    rpm: 40,
    pcsPerRev: 1,
    customer: "Ind Koito",
    sizePart: "5 x 48",
    picShift1: "Achmad Syaiful",
    picShift2: "Yossi Tera P",
    partOptions: [
      { partNo: "A0035-18083-00-A", customer: "Ind Koito", sizePart: "5 x 48", rpm: 40 },
      { partNo: "A0038-17807-00", customer: "Ind Koito", sizePart: "5 x 56", rpm: 40 },
      { partNo: "10035-18751-00", customer: "Ind Koito", sizePart: "5 x 64", rpm: 35 },
      { partNo: "10038-17790-00", customer: "Ind Koito", sizePart: "5 x 72", rpm: 40 },
      { partNo: "A0038-18059-00", customer: "Ind Koito", sizePart: "5 x 76", rpm: 40 },
      { partNo: "A0038-17875-00", customer: "Ind Koito", sizePart: "5 x 80", rpm: 45 },
      { partNo: "A0048-18062-00", customer: "Ind Koito", sizePart: "5 x 90", rpm: 30 },
      { partNo: "A0038-18548-00", customer: "Ind Koito", sizePart: "5 x 100", rpm: 30 },
      { partNo: "92900-06351-00", customer: "Ind Koito", sizePart: "6 x 14", rpm: 35 },
      { partNo: "H002-039-00", customer: "Progress Toyo Ind", sizePart: "5 x 16", rpm: 0 },
      { partNo: "3105-010-00", customer: "Progress Toyo Ind", sizePart: "10,1 x 15,3", rpm: 30 },
      { partNo: "12836-12K01", customer: "Suzuki Indomobil Motor", sizePart: "8 x 7", rpm: 40 },
      { partNo: "3C585-H4320", customer: "Murakami Delloyd Ind", sizePart: "M6X49,6", rpm: 30 },
      { partNo: "7S482-X7V00", customer: "Meidoh Ind", sizePart: "", rpm: 40 },
      { partNo: "000Y02-0410-Y", customer: "Ichikoh Indonesia", sizePart: "M5 x 50", rpm: 35 },
      { partNo: "000Y02-0470-Y", customer: "Ichikoh Indonesia", sizePart: "M5 x 50", rpm: 35 },
      { partNo: "1514 E0 040", customer: "Daikyo Nishikawa", sizePart: "6 x 12,25", rpm: 0 },
      { partNo: "72656-0K020-B", customer: "Chiyoda Industry Indonesia", sizePart: "15 x 6 x 7,6", rpm: 35 },
      { partNo: "983951-09011-M", customer: "Aisin Ind", sizePart: "19,9 x 14", rpm: 50 },
      { partNo: "983951-09018", customer: "Aisin Ind", sizePart: "15,2 x 14", rpm: 50 },
      { partNo: "983951-10005", customer: "Aisin Ind", sizePart: "14,9 x 15", rpm: 50 },
      { partNo: "983951-10007", customer: "Aisin Ind", sizePart: "9,9 x 15", rpm: 45 },
      { partNo: "983951-09011", customer: "Aisin Ind", sizePart: "19,9 x 14", rpm: 50 },
      { partNo: "9M2-2190", customer: "Ichikoh Indonesia", sizePart: "5X58", rpm: 35 },
      { partNo: "983951-09011-C", customer: "Aisin Ind", sizePart: "19,9 x 14", rpm: 60 },
      { partNo: "65639-SEA-3000", customer: "PT. G-TEKT INDONESIA MANUFACTURING", sizePart: "5,25X33", rpm: 40 },
      { partNo: "48966 5PM0A", customer: "PT JTEKT COLUMN SYSTEM INDONESIA", sizePart: "", rpm: 40 },
    ],
  },
  {
    machine: "BP-450",
    partNumber: "507-1046-S7B",
    rpm: 50,
    pcsPerRev: 1,
    customer: "PT. AUTOLIV INDONESIA",
    sizePart: "7/16 x 28 L",
    picShift1: "Iis Iskandar",
    picShift2: "Yossi Tera P",
    partOptions: [
      { partNo: "507-1046-S7B", customer: "PT. AUTOLIV INDONESIA", sizePart: "7/16 x 28 L", rpm: 50 },
      { partNo: "658240400A", customer: "PT. AUTOLIV INDONESIA", sizePart: "7/16 X 41 mm", rpm: 50 },
      { partNo: "658240400A-M", customer: "PT. AUTOLIV INDONESIA", sizePart: "7/16 X 41 mm", rpm: 50 },
      { partNo: "NAB 20388-ZN", customer: "PT. AUTOLIV INDONESIA", sizePart: "7/16 x 36 L", rpm: 50 },
      { partNo: "72702-68020", customer: "PT. MEIDOH INDONESIA", sizePart: "", rpm: 50 },
      { partNo: "AH103-S2K-9802", customer: "PT. FTECH INDONESIA", sizePart: "20 X 73.6", rpm: 50 },
      { partNo: "AH103-S50-0001", customer: "PT. FTECH INDONESIA", sizePart: "16 X 41", rpm: 50 },
      { partNo: "41821-73R00", customer: "PT. MEIDOH INDONESIA", sizePart: "M12 x 55", rpm: 50 },
      { partNo: "85126-52S00", customer: "PT. MEIDOH INDONESIA", sizePart: "M10 X 15", rpm: 50 },
      { partNo: "87493-60M00", customer: "PT. MEIDOH INDONESIA", sizePart: "M10 x 25", rpm: 50 },
      { partNo: "90109-10167", customer: "PT. MEIDOH INDONESIA", sizePart: "M10 x 56", rpm: 50 },
      { partNo: "M015X121", customer: "PT. NHK KBU SEATING", sizePart: "", rpm: 50 },
      { partNo: "23223-22J00", customer: "PT. SANKIN INDONESIA", sizePart: "12.5 x 36", rpm: 50 },
      { partNo: "09106-10064-000", customer: "PT. SUZUKI INDOMOBIL SALES", sizePart: "M10 x 28", rpm: 50 },
      { partNo: "43576B07D01N000", customer: "PT. SUZUKI INDOMOBIL SALES", sizePart: "8 x 10", rpm: 50 },
      { partNo: "09106-10064", customer: "PT. SUZUKI INDOMOBIL MOTOR", sizePart: "M10 x 28", rpm: 50 },
      { partNo: "09247-14052", customer: "PT. SUZUKI INDOMOBIL MOTOR", sizePart: "14 x 12", rpm: 50 },
      { partNo: "43576-07D01", customer: "PT. TRMITRA CHITRAHASTA", sizePart: "8 x 10", rpm: 50 },
      { partNo: "730409-4640", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "7/16 x 63 L", rpm: 50 },
      { partNo: "730409-4650", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "7/16 x 36 L", rpm: 50 },
      { partNo: "730409-4660", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "7/16 x 48 L", rpm: 50 },
      { partNo: "730409-5320", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "7/16 x 48.5 L", rpm: 50 },
      { partNo: "730409-5330", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "7/16 x 35 L", rpm: 50 },
      { partNo: "730409-5380", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "7/16 x 52 L", rpm: 50 },
      { partNo: "730409-5440", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "7/16 x 36.5 L", rpm: 50 },
      { partNo: "730409-5490-B", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "7/16 x 21 L", rpm: 50 },
      { partNo: "730409-5550", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "7/16 / 63", rpm: 50 },
      { partNo: "730409-5560", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "7/16 / 40.5", rpm: 50 },
      { partNo: "730409-5650", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "L - 28", rpm: 50 },
      { partNo: "730409-5760", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "7/16 x 36.5 L", rpm: 50 },
      { partNo: "730409-5490", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "7/16 x 21 L", rpm: 50 },
      { partNo: "622755400A", customer: "PT. AUTOLIV INDONESIA", sizePart: "7/16 x 42 mm", rpm: 50 },
      { partNo: "649964000B", customer: "PT. AUTOLIV INDONESIA", sizePart: "7/16 x 55 mm", rpm: 50 },
    ],
  },
  {
    machine: "HBF-823",
    partNumber: "422168-10040",
    rpm: 60,
    pcsPerRev: 1,
    customer: "PT. ITOMOL INDONESIA",
    sizePart: "5 x 4.5 x 6.7",
    picShift1: "Achmad Syaiful",
    picShift2: "Wakyudi",
    partOptions: [
      { partNo: "422168-10040", customer: "PT. ITOMOL INDONESIA", sizePart: "5 x 4.5 x 6.7", rpm: 60 },
      { partNo: "422168-10050", customer: "PT. ITOMOL INDONESIA", sizePart: "5 x 4.5 x 8.2", rpm: 60 },
      { partNo: "89911-X7103", customer: "PT. MEIDOH INDONESIA", sizePart: "M8X14,9", rpm: 60 },
      { partNo: "89911-X7104", customer: "PT. MEIDOH INDONESIA", sizePart: "M8x22.1", rpm: 60 },
      { partNo: "89911-X7105-A", customer: "PT. MEIDOH INDONESIA", sizePart: "M8X17.1", rpm: 60 },
      { partNo: "BD-141A-2-2", customer: "PT. MEIDOH INDONESIA", sizePart: "-", rpm: 60 },
      { partNo: "BT-068A-1-2", customer: "PT. MEIDOH INDONESIA", sizePart: "8 x 14,9", rpm: 60 },
      { partNo: "730409-5590", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "9 x 7.5", rpm: 60 },
      { partNo: "730409-5710", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "6.5 x 8.5", rpm: 60 },
      { partNo: "7L0990-0410", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "5 x 2.8", rpm: 60 },
      { partNo: "7L0990-0440", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "4 x 2.8", rpm: 55 },
      { partNo: "7L0990-0490", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "6 x 6.2", rpm: 60 },
    ],
  },
  {
    machine: "ZH-30200",
    partNumber: "Y006-004-00",
    rpm: 25,
    pcsPerRev: 1,
    customer: "Progress Toyo Ind",
    sizePart: "9 x 179,7",
    picShift1: "Jason",
    picShift2: "",
    partOptions: [
      { partNo: "Y006-004-00", customer: "Progress Toyo Ind", sizePart: "9 x 179,7", rpm: 25 },
      { partNo: "2282-004-00", customer: "Progress Toyo Ind", sizePart: "9 x 195,6", rpm: 25 },
    ],
  },
  {
    machine: "YH-1552",
    partNumber: "3P519706-16 B",
    rpm: 100,
    pcsPerRev: 1,
    customer: "PT. DAIKIN INDUSTRIES INDONESIA",
    sizePart: "M4x16L",
    picShift1: "Achmad Syaiful",
    picShift2: "Jason",
    partOptions: [
      { partNo: "3P519706-16 B", customer: "PT. DAIKIN INDUSTRIES INDONESIA", sizePart: "M4x16L", rpm: 100 },
      { partNo: "3P519710-1", customer: "PT. DAIKIN INDUSTRIES INDONESIA", sizePart: "M4x20", rpm: 100 },
      { partNo: "3P590969-16", customer: "PT. DAIKIN INDUSTRIES INDONESIA", sizePart: "L 16", rpm: 100 },
      { partNo: "800350-0002-RAH", customer: "PT. TOYOTA BOSHOKU DEVICE INDONESIA", sizePart: "5 x 11", rpm: 105 },
      { partNo: "7L0990-0370", customer: "PT. TOKAI RIKA SAFETY INDONESIA", sizePart: "5 x 6.2", rpm: 105 },
      { partNo: "981411-50005", customer: "PT. INDOSAFETY SENTOSA INFUSTRY", sizePart: "5 x 11", rpm: 105 },
    ],
  },
  {
    machine: "HM-552",
    partNumber: "4P519671-1",
    rpm: 100,
    pcsPerRev: 1,
    customer: "PT. Daikin Indonesia",
    sizePart: "M4X19",
    picShift1: "Jason",
    picShift2: "",
    partOptions: [
      { partNo: "4P519671-1", customer: "PT. Daikin Indonesia", sizePart: "M4X19", rpm: 100 },
    ],
  },
  {
    machine: "HM-676",
    partNumber: "3P519706-1 A",
    rpm: 105,
    pcsPerRev: 1,
    customer: "PT. Daikin Indonesia",
    sizePart: "M4x12L",
    picShift1: "Nanda Ferry C",
    picShift2: "Yossi Tera P",
    partOptions: [
      { partNo: "3P519706-1 A", customer: "PT. Daikin Indonesia", sizePart: "M4x12L", rpm: 105 },
    ],
  },
  {
    machine: "HBF-823 NEW",
    partNumber: "3P540075-1 A",
    rpm: 70,
    pcsPerRev: 1,
    customer: "PT. Daikin Indonesia",
    sizePart: "M4xL 9.5",
    picShift1: "Nanda Ferry C",
    picShift2: "Wakyudi",
    partOptions: [
      { partNo: "3P540075-1 A", customer: "PT. Daikin Indonesia", sizePart: "M4xL 9.5", rpm: 70 },
      { partNo: "3P540084-1 A", customer: "PT. Daikin Indonesia", sizePart: "", rpm: 80 },
      { partNo: "72702-X7A15", customer: "PT. MEIDOH INDONESIA", sizePart: "M6 X 16.3", rpm: 60 },
      { partNo: "72702-X7A16-A", customer: "PT. MEIDOH INDONESIA", sizePart: "M8 X 19", rpm: 60 },
      { partNo: "89911-X7103", customer: "PT. MEIDOH INDONESIA", sizePart: "M8X14,9", rpm: 60 },
      { partNo: "89911-X7104", customer: "PT. MEIDOH INDONESIA", sizePart: "M8x22.1", rpm: 60 },
      { partNo: "89911-X7105-A", customer: "PT. MEIDOH INDONESIA", sizePart: "M8X17.1", rpm: 60 },
      { partNo: "72702-X7A16", customer: "PT. MEIDOH INDONESIA", sizePart: "M8 X 19", rpm: 60 },
      { partNo: "9A1-1660", customer: "PT. ICHIKOH INDONESIA", sizePart: "", rpm: 40 },
    ],
  },
  {
    machine: "PF-860",
    partNumber: "92900-04048-00",
    rpm: 50,
    pcsPerRev: 1,
    customer: "Ind Koito",
    sizePart: "4 x 10,5",
    picShift1: "Iis Iskandar",
    picShift2: "Fiki Firmansyah",
    partOptions: [
      { partNo: "92900-04048-00", customer: "Ind Koito", sizePart: "4 x 10,5", rpm: 50 },
      { partNo: "730409-5020", customer: "Tokai Rika Safety Ind", sizePart: "4 x 8,9", rpm: 50 },
      { partNo: "7S0703-0320", customer: "Tokai Rika Safety Ind", sizePart: "6 x 10,5", rpm: 50 },
      { partNo: "82811A67LAOB", customer: "Sankeikid Manutec Ind", sizePart: "6 x 11", rpm: 50 },
      { partNo: "451791-10060", customer: "Aisin Ind", sizePart: "", rpm: 50 },
      { partNo: "N773803", customer: "PT.NARUMI MANUFACTURING INDONESIA", sizePart: "M6 X 18 mm", rpm: 50 },
      { partNo: "3P540075-1 A", customer: "PT. Daikin Indonesia", sizePart: "M4xL 9.5", rpm: 70 },
    ],
  },
  {
    machine: "CBP-106",
    partNumber: "521-1020-IN",
    rpm: 55,
    pcsPerRev: 1,
    customer: "NHK Spring Indonesia",
    sizePart: "M8X25 Ø 11,97",
    picShift1: "Nanda Ferry C",
    picShift2: "Fiki Firmansyah",
    partOptions: [
      { partNo: "521-1020-IN", customer: "NHK Spring Indonesia", sizePart: "M8X25 Ø 11,97", rpm: 55 },
      { partNo: "531-0930-IN", customer: "NHK Spring Indonesia", sizePart: "M12X20,5", rpm: 45 },
      { partNo: "521-0980-IN", customer: "NHK Spring Indonesia", sizePart: "M8X25 Ø 8,98", rpm: 50 },
      { partNo: "531-0960-IN", customer: "NHK Spring Indonesia", sizePart: "M12X22,5", rpm: 45 },
      { partNo: "521-0990-IN", customer: "NHK Spring Indonesia", sizePart: "011,98XL32", rpm: 50 },
      { partNo: "531-0940-IN", customer: "NHK Spring Indonesia", sizePart: "L21.5", rpm: 45 },
      { partNo: "3P514689-2 B", customer: "PT. Daikin Indonesia", sizePart: "M8x 36L", rpm: 40 },
      { partNo: "3P753195-1", customer: "PT. Daikin Indonesia", sizePart: "M8x 66L", rpm: 40 },
      { partNo: "7J9720-0140", customer: "Tokai Rika Safety Ind", sizePart: "7 x 47,4", rpm: 60 },
      { partNo: "000Y02-0310-Y", customer: "Ichikoh Indonesia", sizePart: "M5 x 31,5", rpm: 50 },
      { partNo: "000Y02-0340-Y", customer: "Ichikoh Indonesia", sizePart: "M5 x 38", rpm: 50 },
      { partNo: "009M2-3230", customer: "Ichikoh Indonesia", sizePart: "M5X38", rpm: 50 },
      { partNo: "3P775008-1", customer: "PT. Daikin Indonesia", sizePart: "M8 x 48", rpm: 40 },
      { partNo: "531-0980-IN", customer: "NHK Spring Indonesia", sizePart: "12 X 21.5", rpm: 45 },
      { partNo: "531-0920-IN", customer: "NHK Spring Indonesia", sizePart: "12 X 21.5", rpm: 45 },
      { partNo: "521-0970-IN", customer: "NHK Spring Indonesia", sizePart: "8.98 X 31", rpm: 50 },
      { partNo: "521-1040-IN", customer: "NHK Spring Indonesia", sizePart: "9 X 31", rpm: 50 },
    ],
  },
  {
    machine: "NP-12",
    partNumber: "416221-10480",
    rpm: 45,
    pcsPerRev: 1,
    customer: "Aisin Ind",
    sizePart: "7,47 x 90,2",
    picShift1: "Nanda Ferry C",
    picShift2: "Wakyudi",
    partOptions: [
      { partNo: "416221-10480", customer: "Aisin Ind", sizePart: "7,47 x 90,2", rpm: 45 },
    ],
  },
];


import { fetchMasters, resetOperationalData, saveMaster } from "../services/dataService";

function buildMergedMasters(apiMasters) {
  const byMachine = new Map((Array.isArray(apiMasters) ? apiMasters : []).map((m) => [m.machine, m]));
  return DEFAULT_MASTER_DATA.map((def) => {
    const api = byMachine.get(def.machine);
    if (!api) return { ...def };
    const hasApiData = !!(api.partNumber || api.isConfigured);
    return {
      ...def,
      ...api,
      partNumber: api.partNumber || def.partNumber || "",
      rpm: api.rpm ?? def.rpm ?? 0,
      pcsPerRev: api.pcsPerRev ?? def.pcsPerRev ?? 1,
      customer: api.customer || def.customer || "",
      sizePart: api.sizePart || def.sizePart || "",
      picShift1: api.picShift1 || def.picShift1 || "",
      picShift2: api.picShift2 || def.picShift2 || "",
      partOptions:
        Array.isArray(api.partOptions) && api.partOptions.length > 0
          ? api.partOptions
          : def.partOptions || [],
      isConfigured: hasApiData || !!api.isConfigured,
    };
  });
}

export default function MasterProduction() {
  const [masters, setMasters] = useState(DEFAULT_MASTER_DATA);
  const [selectedMachine, setSelectedMachine] = useState(MACHINES[0] || "NF-19B");
  const [partNumber, setPartNumber] = useState("");
  const [rpm, setRpm] = useState("");
  const [pcsPerRev, setPcsPerRev] = useState(1);
  const [customer, setCustomer] = useState("");
  const [sizePart, setSizePart] = useState("");
  const [picShift1, setPicShift1] = useState("");
  const [picShift2, setPicShift2] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadMasters = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const apiMasters = await fetchMasters();
      const merged = buildMergedMasters(apiMasters);
      setMasters(merged);
      try {
        localStorage.setItem("yahataMasterProduction", JSON.stringify(merged));
      } catch {}
      window.dispatchEvent(new Event("yahata-storage-updated"));
    } catch (err) {
      setNotice(`Gagal memuat master dari backend: ${err?.message || "unknown error"}`);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadMasters(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentDefault = useMemo(
    () => DEFAULT_MASTER_DATA.find((item) => item.machine === selectedMachine),
    [selectedMachine]
  );

  useEffect(() => {
    const existing =
      masters.find((item) => item.machine === selectedMachine) || currentDefault;
    if (existing) {
      setPartNumber(existing.partNumber || "");
      setRpm(existing.rpm ?? "");
      setPcsPerRev(existing.pcsPerRev || 1);
      setCustomer(existing.customer || "");
      setSizePart(existing.sizePart || "");
      setPicShift1(existing.picShift1 || "");
      setPicShift2(existing.picShift2 || "");
    } else {
      setPartNumber("");
      setRpm("");
      setPcsPerRev(1);
      setCustomer("");
      setSizePart("");
      setPicShift1("");
      setPicShift2("");
    }
  }, [selectedMachine, masters, currentDefault]);

  const persistLocalMirror = (nextList) => {
    setMasters(nextList);
    try {
      localStorage.setItem("yahataMasterProduction", JSON.stringify(nextList));
    } catch {}
    window.dispatchEvent(new Event("yahata-storage-updated"));
  };

  const upsertManyToBackend = async (rows) => {
    for (const row of rows) {
      await saveMaster(row.machine, {
        partNumber: row.partNumber,
        rpm: Number(row.rpm || 0),
        pcsPerRev: Number(row.pcsPerRev || 1),
        customer: row.customer || "",
        sizePart: row.sizePart || "",
        picShift1: row.picShift1 || "",
        picShift2: row.picShift2 || "",
        partOptions: row.partOptions || [],
      });
    }
  };

  const handleSelectPartPreset = (chosenPartNo) => {
    setPartNumber(chosenPartNo);
    const preset = currentDefault?.partOptions?.find(
      (opt) => opt.partNo === chosenPartNo
    );
    if (preset) {
      setRpm(preset.rpm ?? "");
      setCustomer(preset.customer || "");
      setSizePart(preset.sizePart || "");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedMachine || !partNumber.trim()) {
      setNotice("Mesin dan Part Number wajib diisi.");
      return;
    }

    const updatedItem = {
      machine: selectedMachine,
      partNumber: partNumber.trim(),
      rpm: Number(rpm) || 0,
      pcsPerRev: Math.max(1, Number(pcsPerRev) || 1),
      customer: customer.trim(),
      sizePart: sizePart.trim(),
      picShift1: picShift1.trim(),
      picShift2: picShift2.trim(),
      partOptions: currentDefault?.partOptions || [],
      isConfigured: true,
    };

    setSaving(true);
    try {
      const saved = await saveMaster(selectedMachine, updatedItem);
      const mergedSaved = buildMergedMasters([
        ...masters.filter((m) => m.machine !== selectedMachine),
        { ...updatedItem, ...saved, partOptions: updatedItem.partOptions },
      ]);
      persistLocalMirror(mergedSaved);
      setNotice(`Master Production untuk ${selectedMachine} berhasil disimpan.`);
    } catch (err) {
      setNotice(`Gagal menyimpan master ${selectedMachine}: ${err?.message || "unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetSingleMachine = async (machineName, e) => {
    e.stopPropagation();
    const defaultRow = DEFAULT_MASTER_DATA.find((m) => m.machine === machineName);
    if (!defaultRow) return;
    setSaving(true);
    try {
      await saveMaster(machineName, defaultRow);
      const nextList = masters.map((m) => (m.machine === machineName ? { ...defaultRow } : m));
      persistLocalMirror(nextList.length === masters.length ? nextList : buildMergedMasters([...masters, { ...defaultRow }]));
      await loadMasters(false);
      setNotice(`Konfigurasi ${machineName} dikembalikan ke default Excel.`);
    } catch (err) {
      setNotice(`Gagal reset ${machineName}: ${err?.message || "unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToExcelDefault = async () => {
    setSaving(true);
    try {
      await upsertManyToBackend(DEFAULT_MASTER_DATA);
      persistLocalMirror(DEFAULT_MASTER_DATA.map((d) => ({ ...d })));
      await loadMasters(false);
      setNotice("Seluruh 14 mesin berhasil di-reset ke data default Excel Forming.");
    } catch (err) {
      setNotice(`Gagal load default Excel ke backend: ${err?.message || "unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDummyData = async () => {
    const ok = window.confirm(
      "Hapus seluruh data uji coba (Production, Downtime, dan Shift & PIC) di backend? Master Production juga akan dikembalikan ke default Excel."
    );
    if (!ok) return;

    setSaving(true);
    try {
      await resetOperationalData(true);
      await upsertManyToBackend(DEFAULT_MASTER_DATA);
      try {
        ["yahataProductionRecords", "yahataDowntimeEvents", "yahataShiftPicRecords"].forEach((key) =>
          localStorage.removeItem(key)
        );
        localStorage.setItem("yahataMasterProduction", JSON.stringify(DEFAULT_MASTER_DATA));
      } catch {}
      window.dispatchEvent(new Event("yahata-storage-updated"));
      persistLocalMirror(DEFAULT_MASTER_DATA.map((d) => ({ ...d })));
      await loadMasters(false);
      setNotice("Data uji coba dibersihkan dan Master Production dikembalikan ke default Excel.");
    } catch (err) {
      setNotice(`Gagal reset data uji coba: ${err?.message || "unknown error"}${err?.status === 403 ? " (butuh akun admin)" : ""}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredMasters = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return MACHINES.map((machineName) => {
      return (
        masters.find((m) => m.machine === machineName) ||
        DEFAULT_MASTER_DATA.find((m) => m.machine === machineName) || {
          machine: machineName,
          partNumber: "-",
          rpm: 0,
          pcsPerRev: 1,
          customer: "-",
          sizePart: "-",
          picShift1: "-",
          picShift2: "-",
        }
      );
    }).filter((row) => {
      if (!q) return true;
      return (
        row.machine.toLowerCase().includes(q) ||
        String(row.partNumber || "").toLowerCase().includes(q) ||
        String(row.customer || "").toLowerCase().includes(q) ||
        String(row.picShift1 || "").toLowerCase().includes(q) ||
        String(row.picShift2 || "").toLowerCase().includes(q)
      );
    });
  }, [masters, searchTerm]);

  return (
    <div className="rp-page">
      <div className="rp-heading">
        <div>
          <div className="rp-eyebrow">PRODUCTION SETUP / STANDARD</div>
          <h1>Master Production</h1>
          <p>Pengaturan Part Number aktif, standar RPM, customer, dan PIC default per mesin.</p>
        </div>

        <div className="rp-heading-actions">
          <button
            type="button"
            className="rp-refresh-btn"
            onClick={handleResetToExcelDefault}
            disabled={saving || loading}
          >
            ↻ Load Default Excel (14 Mesin)
          </button>
          <button
            type="button"
            className="mp-danger-btn"
            onClick={handleResetDummyData}
            disabled={saving || loading}
          >
            Reset Data Uji Coba
          </button>
        </div>
      </div>

      {notice && <div className="rp-info-note">{notice}</div>}
      {loading && <div className="rp-info-note">Memuat data master dari backend...</div>}

      <section className="rp-filter-panel">
        <form onSubmit={handleSave} className="rp-filters">
          <label>
            Mesin
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
            >
              {MACHINES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>

          {currentDefault?.partOptions?.length > 0 && (
            <label>
              Pilih Part ({currentDefault.partOptions.length})
              <select
                value={partNumber}
                onChange={(e) => handleSelectPartPreset(e.target.value)}
              >
                {currentDefault.partOptions.map((opt, idx) => (
                  <option key={`${opt.partNo}-${idx}`} value={opt.partNo}>
                    {opt.partNo} ({opt.rpm} RPM)
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Part Number Aktif
            <input
              type="text"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              placeholder="Part Number"
            />
          </label>

          <label>
            Standar RPM
            <input
              type="number"
              min="0"
              value={rpm}
              onChange={(e) => setRpm(e.target.value)}
              placeholder="0"
            />
          </label>

          <label>
            Pcs / Rev
            <input
              type="number"
              min="1"
              value={pcsPerRev}
              onChange={(e) => setPcsPerRev(e.target.value)}
              placeholder="1"
            />
          </label>

          <label>
            Customer
            <input
              type="text"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Customer"
            />
          </label>

          <label>
            Size Part
            <input
              type="text"
              value={sizePart}
              onChange={(e) => setSizePart(e.target.value)}
              placeholder="Size Part"
            />
          </label>

          <label>
            PIC Shift 1
            <input
              type="text"
              value={picShift1}
              onChange={(e) => setPicShift1(e.target.value)}
              placeholder="PIC Shift 1"
            />
          </label>

          <label>
            PIC Shift 2
            <input
              type="text"
              value={picShift2}
              onChange={(e) => setPicShift2(e.target.value)}
              placeholder="PIC Shift 2"
            />
          </label>

          <button type="submit" className="prod-submit-btn" disabled={saving || loading}>
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </form>
      </section>

      <section className="rp-panel">
        <div className="rp-panel-heading">
          <div>
            <h2>Daftar Konfigurasi 14 Mesin Forming</h2>
            <p>Klik baris mesin untuk memilih dan mengedit part atau RPM.</p>
          </div>

          <input
            type="text"
            className="mp-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari mesin, part, customer, PIC..."
          />
        </div>

        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                <th>MESIN</th>
                <th>PART NUMBER AKTIF</th>
                <th>SIZE PART</th>
                <th>CUSTOMER</th>
                <th>RPM</th>
                <th>PCS/REV</th>
                <th>PIC SHIFT 1</th>
                <th>PIC SHIFT 2</th>
                <th>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredMasters.map((row) => (
                <tr
                  key={row.machine}
                  onClick={() => setSelectedMachine(row.machine)}
                >
                  <td><strong>{row.machine}</strong></td>
                  <td>{row.partNumber || "-"}</td>
                  <td>{row.sizePart || "-"}</td>
                  <td>{row.customer || "-"}</td>
                  <td><strong>{row.rpm} RPM</strong></td>
                  <td>{row.pcsPerRev || 1}</td>
                  <td>{row.picShift1 || "-"}</td>
                  <td>{row.picShift2 || "-"}</td>
                  <td>
                    <button
                      type="button"
                      className="mp-row-reset-btn"
                      onClick={(e) => handleResetSingleMachine(row.machine, e)}
                      disabled={saving || loading}
                    >
                      Reset
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
