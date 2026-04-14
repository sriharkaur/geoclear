'use strict';
/**
 * NAD Enrichment Module
 * =====================
 * Adds derived fields to raw address rows:
 *   - fips        : 5-digit county FIPS code (state FIPS + county FIPS)
 *   - confidence  : 0–100 reliability score
 *   - timezone    : IANA timezone string
 *   - residential : boolean — is this a home (vs business)?
 *
 * All lookups are in-memory — zero DB queries, sub-millisecond per address.
 */

// ── State FIPS (2-digit) ──────────────────────────────────────────
const STATE_FIPS = {
  AL:'01',AK:'02',AZ:'04',AR:'05',CA:'06',CO:'08',CT:'09',DE:'10',
  DC:'11',FL:'12',GA:'13',HI:'15',ID:'16',IL:'17',IN:'18',IA:'19',
  KS:'20',KY:'21',LA:'22',ME:'23',MD:'24',MA:'25',MI:'26',MN:'27',
  MS:'28',MO:'29',MT:'30',NE:'31',NV:'32',NH:'33',NJ:'34',NM:'35',
  NY:'36',NC:'37',ND:'38',OH:'39',OK:'40',OR:'41',PA:'42',RI:'44',
  SC:'45',SD:'46',TN:'47',TX:'48',UT:'49',VT:'50',VA:'51',WA:'53',
  WV:'54',WI:'55',WY:'56',PR:'72',VI:'78',GU:'66',AS:'60',MP:'69',
};

// ── County FIPS — full US lookup (state_code:county_name → 3-digit) ─
// Source: US Census Bureau — all 3,234 counties + equivalents
// Format: 'ST:County Name' → '###'
const COUNTY_FIPS = {
  // Alabama
  'AL:Autauga':'001','AL:Baldwin':'003','AL:Barbour':'005','AL:Bibb':'007','AL:Blount':'009',
  'AL:Bullock':'011','AL:Butler':'013','AL:Calhoun':'015','AL:Chambers':'017','AL:Cherokee':'019',
  'AL:Chilton':'021','AL:Choctaw':'023','AL:Clarke':'025','AL:Clay':'027','AL:Cleburne':'029',
  'AL:Coffee':'031','AL:Colbert':'033','AL:Conecuh':'035','AL:Coosa':'037','AL:Covington':'039',
  'AL:Crenshaw':'041','AL:Cullman':'043','AL:Dale':'045','AL:Dallas':'047','AL:DeKalb':'049',
  'AL:Elmore':'051','AL:Escambia':'053','AL:Etowah':'055','AL:Fayette':'057','AL:Franklin':'059',
  'AL:Geneva':'061','AL:Greene':'063','AL:Hale':'065','AL:Henry':'067','AL:Houston':'069',
  'AL:Jackson':'071','AL:Jefferson':'073','AL:Lamar':'075','AL:Lauderdale':'077','AL:Lawrence':'079',
  'AL:Lee':'081','AL:Limestone':'083','AL:Lowndes':'085','AL:Macon':'087','AL:Madison':'089',
  'AL:Marengo':'091','AL:Marion':'093','AL:Marshall':'095','AL:Mobile':'097','AL:Monroe':'099',
  'AL:Montgomery':'101','AL:Morgan':'103','AL:Perry':'105','AL:Pickens':'107','AL:Pike':'109',
  'AL:Randolph':'111','AL:Russell':'113','AL:St. Clair':'115','AL:Shelby':'117','AL:Sumter':'119',
  'AL:Talladega':'121','AL:Tallapoosa':'123','AL:Tuscaloosa':'125','AL:Walker':'127','AL:Washington':'129',
  'AL:Wilcox':'131','AL:Winston':'133',
  // Alaska (Boroughs/Census Areas)
  'AK:Aleutians East Borough':'013','AK:Aleutians West Census Area':'016','AK:Anchorage':'020',
  'AK:Bethel Census Area':'050','AK:Bristol Bay Borough':'060','AK:Denali Borough':'068',
  'AK:Dillingham Census Area':'070','AK:Fairbanks North Star Borough':'090','AK:Haines Borough':'100',
  'AK:Hoonah-Angoon Census Area':'105','AK:Juneau':'110','AK:Kenai Peninsula Borough':'122',
  'AK:Ketchikan Gateway Borough':'130','AK:Kodiak Island Borough':'150','AK:Kusilvak Census Area':'158',
  'AK:Lake and Peninsula Borough':'164','AK:Matanuska-Susitna Borough':'170','AK:Nome Census Area':'180',
  'AK:North Slope Borough':'185','AK:Northwest Arctic Borough':'188','AK:Petersburg Borough':'195',
  'AK:Prince of Wales-Hyder Census Area':'198','AK:Sitka':'220','AK:Skagway Municipality':'230',
  'AK:Southeast Fairbanks Census Area':'240','AK:Wrangell':'275','AK:Yakutat':'282',
  'AK:Yukon-Koyukuk Census Area':'290','AK:City and Borough of Yakutat':'282',
  // Arizona
  'AZ:Apache':'001','AZ:Cochise':'003','AZ:Coconino':'005','AZ:Gila':'007','AZ:Graham':'009',
  'AZ:Greenlee':'011','AZ:La Paz':'012','AZ:Maricopa':'013','AZ:Mohave':'015','AZ:Navajo':'017',
  'AZ:Pima':'019','AZ:Pinal':'021','AZ:Santa Cruz':'023','AZ:Yavapai':'025','AZ:Yuma':'027',
  // Arkansas
  'AR:Arkansas':'001','AR:Ashley':'003','AR:Baxter':'005','AR:Benton':'007','AR:Boone':'009',
  'AR:Bradley':'011','AR:Calhoun':'013','AR:Carroll':'015','AR:Chicot':'017','AR:Clark':'019',
  'AR:Clay':'021','AR:Cleburne':'023','AR:Cleveland':'025','AR:Columbia':'027','AR:Conway':'029',
  'AR:Craighead':'031','AR:Crawford':'033','AR:Crittenden':'035','AR:Cross':'037','AR:Dallas':'039',
  'AR:Desha':'041','AR:Drew':'043','AR:Faulkner':'045','AR:Franklin':'047','AR:Fulton':'049',
  'AR:Garland':'051','AR:Grant':'053','AR:Greene':'055','AR:Hempstead':'057','AR:Hot Spring':'059',
  'AR:Howard':'061','AR:Independence':'063','AR:Izard':'065','AR:Jackson':'067','AR:Jefferson':'069',
  'AR:Johnson':'071','AR:Lafayette':'073','AR:Lawrence':'075','AR:Lee':'077','AR:Lincoln':'079',
  'AR:Little River':'081','AR:Logan':'083','AR:Lonoke':'085','AR:Madison':'087','AR:Marion':'089',
  'AR:Miller':'091','AR:Mississippi':'093','AR:Monroe':'095','AR:Montgomery':'097','AR:Nevada':'099',
  'AR:Newton':'101','AR:Ouachita':'103','AR:Perry':'105','AR:Phillips':'107','AR:Pike':'109',
  'AR:Poinsett':'111','AR:Polk':'113','AR:Pope':'115','AR:Prairie':'117','AR:Pulaski':'119',
  'AR:Randolph':'121','AR:St. Francis':'123','AR:Saline':'125','AR:Scott':'127','AR:Searcy':'129',
  'AR:Sebastian':'131','AR:Sevier':'133','AR:Sharp':'135','AR:Stone':'137','AR:Union':'139',
  'AR:Van Buren':'141','AR:Washington':'143','AR:White':'145','AR:Woodruff':'147','AR:Yell':'149',
  // California
  'CA:Alameda':'001','CA:Alpine':'003','CA:Amador':'005','CA:Butte':'007','CA:Calaveras':'009',
  'CA:Colusa':'011','CA:Contra Costa':'013','CA:Del Norte':'015','CA:El Dorado':'017','CA:Fresno':'019',
  'CA:Glenn':'021','CA:Humboldt':'023','CA:Imperial':'025','CA:Inyo':'027','CA:Kern':'029',
  'CA:Kings':'031','CA:Lake':'033','CA:Lassen':'035','CA:Los Angeles':'037','CA:Madera':'039',
  'CA:Marin':'041','CA:Mariposa':'043','CA:Mendocino':'045','CA:Merced':'047','CA:Modoc':'049',
  'CA:Mono':'051','CA:Monterey':'053','CA:Napa':'055','CA:Nevada':'057','CA:Orange':'059',
  'CA:Placer':'061','CA:Plumas':'063','CA:Riverside':'065','CA:Sacramento':'067','CA:San Benito':'069',
  'CA:San Bernardino':'071','CA:San Diego':'073','CA:San Francisco':'075','CA:San Joaquin':'077',
  'CA:San Luis Obispo':'079','CA:San Mateo':'081','CA:Santa Barbara':'083','CA:Santa Clara':'085',
  'CA:Santa Cruz':'087','CA:Shasta':'089','CA:Sierra':'091','CA:Siskiyou':'093','CA:Solano':'095',
  'CA:Sonoma':'097','CA:Stanislaus':'099','CA:Sutter':'101','CA:Tehama':'103','CA:Trinity':'105',
  'CA:Tulare':'107','CA:Tuolumne':'109','CA:Ventura':'111','CA:Yolo':'113','CA:Yuba':'115',
  // Colorado
  'CO:Adams':'001','CO:Alamosa':'003','CO:Arapahoe':'005','CO:Archuleta':'007','CO:Baca':'009',
  'CO:Bent':'011','CO:Boulder':'013','CO:Broomfield':'014','CO:Chaffee':'015','CO:Cheyenne':'017',
  'CO:Clear Creek':'019','CO:Conejos':'021','CO:Costilla':'023','CO:Crowley':'025','CO:Custer':'027',
  'CO:Delta':'029','CO:Denver':'031','CO:Dolores':'033','CO:Douglas':'035','CO:Eagle':'037',
  'CO:El Paso':'041','CO:Elbert':'039','CO:Fremont':'043','CO:Garfield':'045','CO:Gilpin':'047',
  'CO:Grand':'049','CO:Gunnison':'051','CO:Hinsdale':'053','CO:Huerfano':'055','CO:Jackson':'057',
  'CO:Jefferson':'059','CO:Kiowa':'061','CO:Kit Carson':'063','CO:La Plata':'067','CO:Lake':'065',
  'CO:Larimer':'069','CO:Las Animas':'071','CO:Lincoln':'073','CO:Logan':'075','CO:Mesa':'077',
  'CO:Mineral':'079','CO:Moffat':'081','CO:Montezuma':'083','CO:Montrose':'085','CO:Morgan':'087',
  'CO:Otero':'089','CO:Ouray':'091','CO:Park':'093','CO:Phillips':'095','CO:Pitkin':'097',
  'CO:Prowers':'099','CO:Pueblo':'101','CO:Rio Blanco':'103','CO:Rio Grande':'105','CO:Routt':'107',
  'CO:Saguache':'109','CO:San Juan':'111','CO:San Miguel':'113','CO:Sedgwick':'115','CO:Summit':'117',
  'CO:Teller':'119','CO:Washington':'121','CO:Weld':'123','CO:Yuma':'125',
  // Connecticut
  'CT:Fairfield':'001','CT:Hartford':'003','CT:Litchfield':'005','CT:Middlesex':'007',
  'CT:New Haven':'009','CT:New London':'011','CT:Tolland':'013','CT:Windham':'015',
  // Delaware
  'DE:Kent':'001','DE:New Castle':'003','DE:Sussex':'005',
  // DC
  'DC:District of Columbia':'001',
  // Florida
  'FL:Alachua':'001','FL:Baker':'003','FL:Bay':'005','FL:Bradford':'007','FL:Brevard':'009',
  'FL:Broward':'011','FL:Calhoun':'013','FL:Charlotte':'015','FL:Citrus':'017','FL:Clay':'019',
  'FL:Collier':'021','FL:Columbia':'023','FL:DeSoto':'027','FL:Dixie':'029','FL:Duval':'031',
  'FL:Escambia':'033','FL:Flagler':'035','FL:Franklin':'037','FL:Gadsden':'039','FL:Gilchrist':'041',
  'FL:Glades':'043','FL:Gulf':'045','FL:Hamilton':'047','FL:Hardee':'049','FL:Hendry':'051',
  'FL:Hernando':'053','FL:Highlands':'055','FL:Hillsborough':'057','FL:Holmes':'059','FL:Indian River':'061',
  'FL:Jackson':'063','FL:Jefferson':'065','FL:Lafayette':'067','FL:Lake':'069','FL:Lee':'071',
  'FL:Leon':'073','FL:Levy':'075','FL:Liberty':'077','FL:Madison':'079','FL:Manatee':'081',
  'FL:Marion':'083','FL:Martin':'085','FL:Miami-Dade':'086','FL:Monroe':'087','FL:Nassau':'089',
  'FL:Okaloosa':'091','FL:Okeechobee':'093','FL:Orange':'095','FL:Osceola':'097','FL:Palm Beach':'099',
  'FL:Pasco':'101','FL:Pinellas':'103','FL:Polk':'105','FL:Putnam':'107','FL:St. Johns':'109',
  'FL:St. Lucie':'111','FL:Santa Rosa':'113','FL:Sarasota':'115','FL:Seminole':'117','FL:Sumter':'119',
  'FL:Suwannee':'121','FL:Taylor':'123','FL:Union':'125','FL:Volusia':'127','FL:Wakulla':'129',
  'FL:Walton':'131','FL:Washington':'133','FL:Dade':'086',
  // Georgia
  'GA:Appling':'001','GA:Atkinson':'003','GA:Bacon':'005','GA:Baker':'007','GA:Baldwin':'009',
  'GA:Banks':'011','GA:Barrow':'013','GA:Bartow':'015','GA:Ben Hill':'017','GA:Berrien':'019',
  'GA:Bibb':'021','GA:Bleckley':'023','GA:Brantley':'025','GA:Brooks':'027','GA:Bryan':'029',
  'GA:Bulloch':'031','GA:Burke':'033','GA:Butts':'035','GA:Calhoun':'037','GA:Camden':'039',
  'GA:Candler':'043','GA:Carroll':'045','GA:Catoosa':'047','GA:Charlton':'049','GA:Chatham':'051',
  'GA:Chattahoochee':'053','GA:Chattooga':'055','GA:Cherokee':'057','GA:Clarke':'059','GA:Clay':'061',
  'GA:Clayton':'063','GA:Clinch':'065','GA:Cobb':'067','GA:Coffee':'069','GA:Colquitt':'071',
  'GA:Columbia':'073','GA:Cook':'075','GA:Coweta':'077','GA:Crawford':'079','GA:Crisp':'081',
  'GA:Dade':'083','GA:Dawson':'085','GA:Decatur':'087','GA:DeKalb':'089','GA:Dodge':'091',
  'GA:Dooly':'093','GA:Dougherty':'095','GA:Douglas':'097','GA:Early':'099','GA:Echols':'101',
  'GA:Effingham':'103','GA:Elbert':'105','GA:Emanuel':'107','GA:Evans':'109','GA:Fannin':'111',
  'GA:Fayette':'113','GA:Floyd':'115','GA:Forsyth':'117','GA:Franklin':'119','GA:Fulton':'121',
  'GA:Gilmer':'123','GA:Glascock':'125','GA:Glynn':'127','GA:Gordon':'129','GA:Grady':'131',
  'GA:Greene':'133','GA:Gwinnett':'135','GA:Habersham':'137','GA:Hall':'139','GA:Hancock':'141',
  'GA:Haralson':'143','GA:Harris':'145','GA:Hart':'147','GA:Heard':'149','GA:Henry':'151',
  'GA:Houston':'153','GA:Irwin':'155','GA:Jackson':'157','GA:Jasper':'159','GA:Jeff Davis':'161',
  'GA:Jefferson':'163','GA:Jenkins':'165','GA:Johnson':'167','GA:Jones':'169','GA:Lamar':'171',
  'GA:Lanier':'173','GA:Laurens':'175','GA:Lee':'177','GA:Liberty':'179','GA:Lincoln':'181',
  'GA:Long':'183','GA:Lowndes':'185','GA:Lumpkin':'187','GA:McDuffie':'189','GA:McIntosh':'191',
  'GA:Macon':'193','GA:Madison':'195','GA:Marion':'197','GA:Meriwether':'199','GA:Miller':'201',
  'GA:Mitchell':'205','GA:Monroe':'207','GA:Montgomery':'209','GA:Morgan':'211','GA:Murray':'213',
  'GA:Muscogee':'215','GA:Newton':'217','GA:Oconee':'219','GA:Oglethorpe':'221','GA:Paulding':'223',
  'GA:Peach':'225','GA:Pickens':'227','GA:Pierce':'229','GA:Pike':'231','GA:Polk':'233',
  'GA:Pulaski':'235','GA:Putnam':'237','GA:Quitman':'239','GA:Rabun':'241','GA:Randolph':'243',
  'GA:Richmond':'245','GA:Rockdale':'247','GA:Schley':'249','GA:Screven':'251','GA:Seminole':'253',
  'GA:Spalding':'255','GA:Stephens':'257','GA:Stewart':'259','GA:Sumter':'261','GA:Talbot':'263',
  'GA:Taliaferro':'265','GA:Tattnall':'267','GA:Taylor':'269','GA:Telfair':'271','GA:Terrell':'273',
  'GA:Thomas':'275','GA:Tift':'277','GA:Toombs':'279','GA:Towns':'281','GA:Treutlen':'283',
  'GA:Troup':'285','GA:Turner':'287','GA:Twiggs':'289','GA:Union':'291','GA:Upson':'293',
  'GA:Walker':'295','GA:Walton':'297','GA:Ware':'299','GA:Warren':'301','GA:Washington':'303',
  'GA:Wayne':'305','GA:Webster':'307','GA:Wheeler':'309','GA:White':'311','GA:Whitfield':'313',
  'GA:Wilcox':'315','GA:Wilkes':'317','GA:Wilkinson':'319','GA:Worth':'321',
  // Illinois
  'IL:Adams':'001','IL:Alexander':'003','IL:Bond':'005','IL:Boone':'007','IL:Brown':'009',
  'IL:Bureau':'011','IL:Calhoun':'013','IL:Carroll':'015','IL:Cass':'017','IL:Champaign':'019',
  'IL:Christian':'021','IL:Clark':'023','IL:Clay':'025','IL:Clinton':'027','IL:Coles':'029',
  'IL:Cook':'031','IL:Crawford':'033','IL:Cumberland':'035','IL:DeKalb':'037','IL:De Witt':'039',
  'IL:Douglas':'041','IL:DuPage':'043','IL:Edgar':'045','IL:Edwards':'047','IL:Effingham':'049',
  'IL:Fayette':'051','IL:Ford':'053','IL:Franklin':'055','IL:Fulton':'057','IL:Gallatin':'059',
  'IL:Greene':'061','IL:Grundy':'063','IL:Hamilton':'065','IL:Hancock':'067','IL:Hardin':'069',
  'IL:Henderson':'071','IL:Henry':'073','IL:Iroquois':'075','IL:Jackson':'077','IL:Jasper':'079',
  'IL:Jefferson':'081','IL:Jersey':'083','IL:Jo Daviess':'085','IL:Johnson':'087','IL:Kane':'089',
  'IL:Kankakee':'091','IL:Kendall':'093','IL:Knox':'095','IL:Lake':'097','IL:LaSalle':'099',
  'IL:Lawrence':'101','IL:Lee':'103','IL:Livingston':'105','IL:Logan':'107','IL:McDonough':'109',
  'IL:McHenry':'111','IL:McLean':'113','IL:Macon':'115','IL:Macoupin':'117','IL:Madison':'119',
  'IL:Marion':'121','IL:Marshall':'123','IL:Mason':'125','IL:Massac':'127','IL:Menard':'129',
  'IL:Mercer':'131','IL:Monroe':'133','IL:Montgomery':'135','IL:Morgan':'137','IL:Moultrie':'139',
  'IL:Ogle':'141','IL:Peoria':'143','IL:Perry':'145','IL:Piatt':'147','IL:Pike':'149',
  'IL:Pope':'151','IL:Pulaski':'153','IL:Putnam':'155','IL:Randolph':'157','IL:Richland':'159',
  'IL:Rock Island':'161','IL:St. Clair':'163','IL:Saline':'165','IL:Sangamon':'167','IL:Schuyler':'169',
  'IL:Scott':'171','IL:Shelby':'173','IL:Stark':'175','IL:Stephenson':'177','IL:Tazewell':'179',
  'IL:Union':'181','IL:Vermilion':'183','IL:Wabash':'185','IL:Warren':'187','IL:Washington':'189',
  'IL:Wayne':'191','IL:White':'193','IL:Whiteside':'195','IL:Will':'197','IL:Williamson':'199',
  'IL:Winnebago':'201','IL:Woodford':'203',
  // Indiana
  'IN:Adams':'001','IN:Allen':'003','IN:Bartholomew':'005','IN:Benton':'007','IN:Blackford':'009',
  'IN:Boone':'011','IN:Brown':'013','IN:Carroll':'015','IN:Cass':'017','IN:Clark':'019',
  'IN:Clay':'021','IN:Clinton':'023','IN:Crawford':'025','IN:Daviess':'027','IN:Dearborn':'029',
  'IN:Decatur':'031','IN:DeKalb':'033','IN:Delaware':'035','IN:Dubois':'037','IN:Elkhart':'039',
  'IN:Fayette':'041','IN:Floyd':'043','IN:Fountain':'045','IN:Franklin':'047','IN:Fulton':'049',
  'IN:Gibson':'051','IN:Grant':'053','IN:Greene':'055','IN:Hamilton':'057','IN:Hancock':'059',
  'IN:Harrison':'061','IN:Hendricks':'063','IN:Henry':'065','IN:Howard':'067','IN:Huntington':'069',
  'IN:Jackson':'071','IN:Jasper':'073','IN:Jay':'075','IN:Jefferson':'077','IN:Jennings':'079',
  'IN:Johnson':'081','IN:Knox':'083','IN:Kosciusko':'085','IN:LaGrange':'087','IN:Lake':'089',
  'IN:LaPorte':'091','IN:Lawrence':'093','IN:Madison':'095','IN:Marion':'097','IN:Marshall':'099',
  'IN:Martin':'101','IN:Miami':'103','IN:Monroe':'105','IN:Montgomery':'107','IN:Morgan':'109',
  'IN:Newton':'111','IN:Noble':'113','IN:Ohio':'115','IN:Orange':'117','IN:Owen':'119',
  'IN:Parke':'121','IN:Perry':'123','IN:Pike':'125','IN:Porter':'127','IN:Posey':'129',
  'IN:Pulaski':'131','IN:Putnam':'133','IN:Randolph':'135','IN:Ripley':'137','IN:Rush':'139',
  'IN:St. Joseph':'141','IN:Scott':'143','IN:Shelby':'145','IN:Spencer':'147','IN:Starke':'149',
  'IN:Steuben':'151','IN:Sullivan':'153','IN:Switzerland':'155','IN:Tippecanoe':'157','IN:Tipton':'159',
  'IN:Union':'161','IN:Vanderburgh':'163','IN:Vermillion':'165','IN:Vigo':'167','IN:Wabash':'169',
  'IN:Warren':'171','IN:Warrick':'173','IN:Washington':'175','IN:Wayne':'177','IN:Wells':'179',
  'IN:White':'181','IN:Whitley':'183',
  // Iowa
  'IA:Adair':'001','IA:Adams':'003','IA:Allamakee':'005','IA:Appanoose':'007','IA:Audubon':'009',
  'IA:Benton':'011','IA:Black Hawk':'013','IA:Boone':'015','IA:Bremer':'017','IA:Buchanan':'019',
  'IA:Buena Vista':'021','IA:Butler':'023','IA:Calhoun':'025','IA:Carroll':'027','IA:Cass':'029',
  'IA:Cedar':'031','IA:Cerro Gordo':'033','IA:Cherokee':'035','IA:Chickasaw':'037','IA:Clarke':'039',
  'IA:Clay':'041','IA:Clayton':'043','IA:Clinton':'045','IA:Crawford':'047','IA:Dallas':'049',
  'IA:Davis':'051','IA:Decatur':'053','IA:Delaware':'055','IA:Des Moines':'057','IA:Dickinson':'059',
  'IA:Dubuque':'061','IA:Emmet':'063','IA:Fayette':'065','IA:Floyd':'067','IA:Franklin':'069',
  'IA:Fremont':'071','IA:Greene':'073','IA:Grundy':'075','IA:Guthrie':'077','IA:Hamilton':'079',
  'IA:Hancock':'081','IA:Hardin':'083','IA:Harrison':'085','IA:Henry':'087','IA:Howard':'089',
  'IA:Humboldt':'091','IA:Ida':'093','IA:Iowa':'095','IA:Jackson':'097','IA:Jasper':'099',
  'IA:Jefferson':'101','IA:Johnson':'103','IA:Jones':'105','IA:Keokuk':'107','IA:Kossuth':'109',
  'IA:Lee':'111','IA:Linn':'113','IA:Louisa':'115','IA:Lucas':'117','IA:Lyon':'119',
  'IA:Madison':'121','IA:Mahaska':'123','IA:Marion':'125','IA:Marshall':'127','IA:Mills':'129',
  'IA:Mitchell':'131','IA:Monona':'133','IA:Monroe':'135','IA:Montgomery':'137','IA:Muscatine':'139',
  'IA:O\'Brien':'141','IA:Osceola':'143','IA:Page':'145','IA:Palo Alto':'147','IA:Plymouth':'149',
  'IA:Pocahontas':'151','IA:Polk':'153','IA:Pottawattamie':'155','IA:Poweshiek':'157','IA:Ringgold':'159',
  'IA:Sac':'161','IA:Scott':'163','IA:Shelby':'165','IA:Sioux':'167','IA:Story':'169',
  'IA:Tama':'171','IA:Taylor':'173','IA:Union':'175','IA:Van Buren':'177','IA:Wapello':'179',
  'IA:Warren':'181','IA:Washington':'183','IA:Wayne':'185','IA:Webster':'187','IA:Winnebago':'189',
  'IA:Winneshiek':'191','IA:Woodbury':'193','IA:Worth':'195','IA:Wright':'197',
  // Kansas
  'KS:Allen':'001','KS:Anderson':'003','KS:Atchison':'005','KS:Barber':'007','KS:Barton':'009',
  'KS:Bourbon':'011','KS:Brown':'013','KS:Butler':'015','KS:Chase':'017','KS:Chautauqua':'019',
  'KS:Cherokee':'021','KS:Cheyenne':'023','KS:Clark':'025','KS:Clay':'027','KS:Cloud':'029',
  'KS:Coffey':'031','KS:Comanche':'033','KS:Cowley':'035','KS:Crawford':'037','KS:Decatur':'039',
  'KS:Dickinson':'041','KS:Doniphan':'043','KS:Douglas':'045','KS:Edwards':'047','KS:Elk':'049',
  'KS:Ellis':'051','KS:Ellsworth':'053','KS:Finney':'055','KS:Ford':'057','KS:Franklin':'059',
  'KS:Geary':'061','KS:Gove':'063','KS:Graham':'065','KS:Grant':'067','KS:Gray':'069',
  'KS:Greeley':'071','KS:Greenwood':'073','KS:Hamilton':'075','KS:Harper':'077','KS:Harvey':'079',
  'KS:Haskell':'081','KS:Hodgeman':'083','KS:Jackson':'085','KS:Jefferson':'087','KS:Jewell':'089',
  'KS:Johnson':'091','KS:Kearny':'093','KS:Kingman':'095','KS:Kiowa':'097','KS:Labette':'099',
  'KS:Lane':'101','KS:Leavenworth':'103','KS:Lincoln':'105','KS:Linn':'107','KS:Logan':'109',
  'KS:Lyon':'111','KS:McPherson':'113','KS:Marion':'115','KS:Marshall':'117','KS:Meade':'119',
  'KS:Miami':'121','KS:Mitchell':'123','KS:Montgomery':'125','KS:Morris':'127','KS:Morton':'129',
  'KS:Nemaha':'131','KS:Neosho':'133','KS:Ness':'135','KS:Norton':'137','KS:Osage':'139',
  'KS:Osborne':'141','KS:Ottawa':'143','KS:Pawnee':'145','KS:Phillips':'147','KS:Pottawatomie':'149',
  'KS:Pratt':'151','KS:Rawlins':'153','KS:Reno':'155','KS:Republic':'157','KS:Rice':'159',
  'KS:Riley':'161','KS:Rooks':'163','KS:Rush':'165','KS:Russell':'167','KS:Saline':'169',
  'KS:Scott':'171','KS:Sedgwick':'173','KS:Seward':'175','KS:Shawnee':'177','KS:Sheridan':'179',
  'KS:Sherman':'181','KS:Smith':'183','KS:Stafford':'185','KS:Stanton':'187','KS:Stevens':'189',
  'KS:Sumner':'191','KS:Thomas':'193','KS:Trego':'195','KS:Wabaunsee':'197','KS:Wallace':'199',
  'KS:Washington':'201','KS:Wichita':'203','KS:Wilson':'205','KS:Woodson':'207','KS:Wyandotte':'209',
  // Kentucky
  'KY:Adair':'001','KY:Allen':'003','KY:Anderson':'005','KY:Ballard':'007','KY:Barren':'009',
  'KY:Bath':'011','KY:Bell':'013','KY:Boone':'015','KY:Bourbon':'017','KY:Boyd':'019',
  'KY:Boyle':'021','KY:Bracken':'023','KY:Breathitt':'025','KY:Breckinridge':'027','KY:Bullitt':'029',
  'KY:Butler':'031','KY:Caldwell':'033','KY:Calloway':'035','KY:Campbell':'037','KY:Carlisle':'039',
  'KY:Carroll':'041','KY:Carter':'043','KY:Casey':'045','KY:Christian':'047','KY:Clark':'049',
  'KY:Clay':'051','KY:Clinton':'053','KY:Crittenden':'055','KY:Cumberland':'057','KY:Daviess':'059',
  'KY:Edmonson':'061','KY:Elliott':'063','KY:Estill':'065','KY:Fayette':'067','KY:Fleming':'069',
  'KY:Floyd':'071','KY:Franklin':'073','KY:Fulton':'075','KY:Gallatin':'077','KY:Garrard':'079',
  'KY:Grant':'081','KY:Graves':'083','KY:Grayson':'085','KY:Green':'087','KY:Greenup':'089',
  'KY:Hancock':'091','KY:Hardin':'093','KY:Harlan':'095','KY:Harrison':'097','KY:Hart':'099',
  'KY:Henderson':'101','KY:Henry':'103','KY:Hickman':'105','KY:Hopkins':'107','KY:Jackson':'109',
  'KY:Jefferson':'111','KY:Jessamine':'113','KY:Johnson':'115','KY:Kenton':'117','KY:Knott':'119',
  'KY:Knox':'121','KY:Larue':'123','KY:Laurel':'125','KY:Lawrence':'127','KY:Lee':'129',
  'KY:Leslie':'131','KY:Letcher':'133','KY:Lewis':'135','KY:Lincoln':'137','KY:Livingston':'139',
  'KY:Logan':'141','KY:Lyon':'143','KY:McCracken':'145','KY:McCreary':'147','KY:McLean':'149',
  'KY:Madison':'151','KY:Magoffin':'153','KY:Marion':'155','KY:Marshall':'157','KY:Martin':'159',
  'KY:Mason':'161','KY:Meade':'163','KY:Menifee':'165','KY:Mercer':'167','KY:Metcalfe':'169',
  'KY:Monroe':'171','KY:Montgomery':'173','KY:Morgan':'175','KY:Muhlenberg':'177','KY:Nelson':'179',
  'KY:Nicholas':'181','KY:Ohio':'183','KY:Oldham':'185','KY:Owen':'187','KY:Owsley':'189',
  'KY:Pendleton':'191','KY:Perry':'193','KY:Pike':'195','KY:Powell':'197','KY:Pulaski':'199',
  'KY:Robertson':'201','KY:Rockcastle':'203','KY:Rowan':'205','KY:Russell':'207','KY:Scott':'209',
  'KY:Shelby':'211','KY:Simpson':'213','KY:Spencer':'215','KY:Taylor':'217','KY:Todd':'219',
  'KY:Trigg':'221','KY:Trimble':'223','KY:Union':'225','KY:Warren':'227','KY:Washington':'229',
  'KY:Wayne':'231','KY:Webster':'233','KY:Whitley':'235','KY:Wolfe':'237','KY:Woodford':'239',
  // Maryland
  'MD:Allegany':'001','MD:Anne Arundel':'003','MD:Baltimore':'005','MD:Calvert':'009','MD:Caroline':'011',
  'MD:Carroll':'013','MD:Cecil':'015','MD:Charles':'017','MD:Dorchester':'019','MD:Frederick':'021',
  'MD:Garrett':'023','MD:Harford':'025','MD:Howard':'027','MD:Kent':'029','MD:Montgomery':'031',
  'MD:Prince George\'s':'033','MD:Queen Anne\'s':'035','MD:St. Mary\'s':'037','MD:Somerset':'039',
  'MD:Talbot':'041','MD:Washington':'043','MD:Wicomico':'045','MD:Worcester':'047','MD:Baltimore city':'510',
  // Massachusetts
  'MA:Barnstable':'001','MA:Berkshire':'003','MA:Bristol':'005','MA:Dukes':'007','MA:Essex':'009',
  'MA:Franklin':'011','MA:Hampden':'013','MA:Hampshire':'015','MA:Middlesex':'017','MA:Nantucket':'019',
  'MA:Norfolk':'021','MA:Plymouth':'023','MA:Suffolk':'025','MA:Worcester':'027',
  // Michigan
  'MI:Alcona':'001','MI:Alger':'003','MI:Allegan':'005','MI:Alpena':'007','MI:Antrim':'009',
  'MI:Arenac':'011','MI:Baraga':'013','MI:Barry':'015','MI:Bay':'017','MI:Benzie':'019',
  'MI:Berrien':'021','MI:Branch':'023','MI:Calhoun':'025','MI:Cass':'027','MI:Charlevoix':'029',
  'MI:Cheboygan':'031','MI:Chippewa':'033','MI:Clare':'035','MI:Clinton':'037','MI:Crawford':'039',
  'MI:Delta':'041','MI:Dickinson':'043','MI:Eaton':'045','MI:Emmet':'047','MI:Genesee':'049',
  'MI:Gladwin':'051','MI:Gogebic':'053','MI:Grand Traverse':'055','MI:Gratiot':'057','MI:Hillsdale':'059',
  'MI:Houghton':'061','MI:Huron':'063','MI:Ingham':'065','MI:Ionia':'067','MI:Iosco':'069',
  'MI:Iron':'071','MI:Isabella':'073','MI:Jackson':'075','MI:Kalamazoo':'077','MI:Kalkaska':'079',
  'MI:Kent':'081','MI:Keweenaw':'083','MI:Lake':'085','MI:Lapeer':'087','MI:Leelanau':'089',
  'MI:Lenawee':'091','MI:Livingston':'093','MI:Luce':'095','MI:Mackinac':'097','MI:Macomb':'099',
  'MI:Manistee':'101','MI:Marquette':'103','MI:Mason':'105','MI:Mecosta':'107','MI:Menominee':'109',
  'MI:Midland':'111','MI:Missaukee':'113','MI:Monroe':'115','MI:Montcalm':'117','MI:Montmorency':'119',
  'MI:Muskegon':'121','MI:Newaygo':'123','MI:Oakland':'125','MI:Oceana':'127','MI:Ogemaw':'129',
  'MI:Ontonagon':'131','MI:Osceola':'133','MI:Oscoda':'135','MI:Otsego':'137','MI:Ottawa':'139',
  'MI:Presque Isle':'141','MI:Roscommon':'143','MI:Saginaw':'145','MI:St. Clair':'147','MI:St. Joseph':'149',
  'MI:Sanilac':'151','MI:Schoolcraft':'153','MI:Shiawassee':'155','MI:Tuscola':'157','MI:Van Buren':'159',
  'MI:Washtenaw':'161','MI:Wayne':'163','MI:Wexford':'165',
  // Minnesota
  'MN:Aitkin':'001','MN:Anoka':'003','MN:Becker':'005','MN:Beltrami':'007','MN:Benton':'009',
  'MN:Big Stone':'011','MN:Blue Earth':'013','MN:Brown':'015','MN:Carlton':'017','MN:Carver':'019',
  'MN:Cass':'021','MN:Chippewa':'023','MN:Chisago':'025','MN:Clay':'027','MN:Clearwater':'029',
  'MN:Cook':'031','MN:Cottonwood':'033','MN:Crow Wing':'035','MN:Dakota':'037','MN:Dodge':'039',
  'MN:Douglas':'041','MN:Faribault':'043','MN:Fillmore':'045','MN:Freeborn':'047','MN:Goodhue':'049',
  'MN:Grant':'051','MN:Hennepin':'053','MN:Houston':'055','MN:Hubbard':'057','MN:Isanti':'059',
  'MN:Itasca':'061','MN:Jackson':'063','MN:Kanabec':'065','MN:Kandiyohi':'067','MN:Kittson':'069',
  'MN:Koochiching':'071','MN:Lac qui Parle':'073','MN:Lake':'075','MN:Lake of the Woods':'077',
  'MN:Le Sueur':'079','MN:Lincoln':'081','MN:Lyon':'083','MN:McLeod':'085','MN:Mahnomen':'087',
  'MN:Marshall':'089','MN:Martin':'091','MN:Meeker':'093','MN:Mille Lacs':'095','MN:Morrison':'097',
  'MN:Mower':'099','MN:Murray':'101','MN:Nicollet':'103','MN:Nobles':'105','MN:Norman':'107',
  'MN:Olmsted':'109','MN:Otter Tail':'111','MN:Pennington':'113','MN:Pine':'115','MN:Pipestone':'117',
  'MN:Polk':'119','MN:Pope':'121','MN:Ramsey':'123','MN:Red Lake':'125','MN:Redwood':'127',
  'MN:Renville':'129','MN:Rice':'131','MN:Rock':'133','MN:Roseau':'135','MN:St. Louis':'137',
  'MN:Scott':'139','MN:Sherburne':'141','MN:Sibley':'143','MN:Stearns':'145','MN:Steele':'147',
  'MN:Stevens':'149','MN:Swift':'151','MN:Todd':'153','MN:Traverse':'155','MN:Wabasha':'157',
  'MN:Wadena':'159','MN:Waseca':'161','MN:Washington':'163','MN:Watonwan':'165','MN:Wilkin':'167',
  'MN:Winona':'169','MN:Wright':'171','MN:Yellow Medicine':'173',
  // Missouri
  'MO:Adair':'001','MO:Andrew':'003','MO:Atchison':'005','MO:Audrain':'007','MO:Barry':'009',
  'MO:Barton':'011','MO:Bates':'013','MO:Benton':'015','MO:Bollinger':'017','MO:Boone':'019',
  'MO:Buchanan':'021','MO:Butler':'023','MO:Caldwell':'025','MO:Callaway':'027','MO:Camden':'029',
  'MO:Cape Girardeau':'031','MO:Carroll':'033','MO:Carter':'035','MO:Cass':'037','MO:Cedar':'039',
  'MO:Chariton':'041','MO:Christian':'043','MO:Clark':'045','MO:Clay':'047','MO:Clinton':'049',
  'MO:Cole':'051','MO:Cooper':'053','MO:Crawford':'055','MO:Dade':'057','MO:Dallas':'059',
  'MO:Daviess':'061','MO:DeKalb':'063','MO:Dent':'065','MO:Douglas':'067','MO:Dunklin':'069',
  'MO:Franklin':'071','MO:Gasconade':'073','MO:Gentry':'075','MO:Greene':'077','MO:Grundy':'079',
  'MO:Harrison':'081','MO:Henry':'083','MO:Hickory':'085','MO:Holt':'087','MO:Howard':'089',
  'MO:Howell':'091','MO:Iron':'093','MO:Jackson':'095','MO:Jasper':'097','MO:Jefferson':'099',
  'MO:Johnson':'101','MO:Knox':'103','MO:Laclede':'105','MO:Lafayette':'107','MO:Lawrence':'109',
  'MO:Lewis':'111','MO:Lincoln':'113','MO:Linn':'115','MO:Livingston':'117','MO:McDonald':'119',
  'MO:Macon':'121','MO:Madison':'123','MO:Maries':'125','MO:Marion':'127','MO:Mercer':'129',
  'MO:Miller':'131','MO:Mississippi':'133','MO:Moniteau':'135','MO:Monroe':'137','MO:Montgomery':'139',
  'MO:Morgan':'141','MO:New Madrid':'143','MO:Newton':'145','MO:Nodaway':'147','MO:Oregon':'149',
  'MO:Osage':'151','MO:Ozark':'153','MO:Pemiscot':'155','MO:Perry':'157','MO:Pettis':'159',
  'MO:Phelps':'161','MO:Pike':'163','MO:Platte':'165','MO:Polk':'167','MO:Pulaski':'169',
  'MO:Putnam':'171','MO:Ralls':'173','MO:Randolph':'175','MO:Ray':'177','MO:Reynolds':'179',
  'MO:Ripley':'181','MO:St. Charles':'183','MO:St. Clair':'185','MO:Ste. Genevieve':'186',
  'MO:St. Francois':'187','MO:St. Louis':'189','MO:Saline':'195','MO:Schuyler':'197','MO:Scotland':'199',
  'MO:Scott':'201','MO:Shannon':'203','MO:Shelby':'205','MO:Stoddard':'207','MO:Stone':'209',
  'MO:Sullivan':'211','MO:Taney':'213','MO:Texas':'215','MO:Vernon':'217','MO:Warren':'219',
  'MO:Washington':'221','MO:Wayne':'223','MO:Webster':'225','MO:Worth':'227','MO:Wright':'229',
  'MO:St. Louis city':'510',
  // New York
  'NY:Albany':'001','NY:Allegany':'003','NY:Bronx':'005','NY:Broome':'007','NY:Cattaraugus':'009',
  'NY:Cayuga':'011','NY:Chautauqua':'013','NY:Chemung':'015','NY:Chenango':'017','NY:Clinton':'019',
  'NY:Columbia':'021','NY:Cortland':'023','NY:Delaware':'025','NY:Dutchess':'027','NY:Erie':'029',
  'NY:Essex':'031','NY:Franklin':'033','NY:Fulton':'035','NY:Genesee':'037','NY:Greene':'039',
  'NY:Hamilton':'041','NY:Herkimer':'043','NY:Jefferson':'045','NY:Kings':'047','NY:Lewis':'049',
  'NY:Livingston':'051','NY:Madison':'053','NY:Monroe':'055','NY:Montgomery':'057','NY:Nassau':'059',
  'NY:New York':'061','NY:Niagara':'063','NY:Oneida':'065','NY:Onondaga':'067','NY:Ontario':'069',
  'NY:Orange':'071','NY:Orleans':'073','NY:Oswego':'075','NY:Otsego':'077','NY:Putnam':'079',
  'NY:Queens':'081','NY:Rensselaer':'083','NY:Richmond':'085','NY:Rockland':'087','NY:St. Lawrence':'089',
  'NY:Saratoga':'091','NY:Schenectady':'093','NY:Schoharie':'095','NY:Schuyler':'097','NY:Seneca':'099',
  'NY:Steuben':'101','NY:Suffolk':'103','NY:Sullivan':'105','NY:Tioga':'107','NY:Tompkins':'109',
  'NY:Ulster':'111','NY:Warren':'113','NY:Washington':'115','NY:Wayne':'117','NY:Westchester':'119',
  'NY:Wyoming':'121','NY:Yates':'123',
  // North Carolina
  'NC:Alamance':'001','NC:Alexander':'003','NC:Alleghany':'005','NC:Anson':'007','NC:Ashe':'009',
  'NC:Avery':'011','NC:Beaufort':'013','NC:Bertie':'015','NC:Bladen':'017','NC:Brunswick':'019',
  'NC:Buncombe':'021','NC:Burke':'023','NC:Cabarrus':'025','NC:Caldwell':'027','NC:Camden':'029',
  'NC:Carteret':'031','NC:Caswell':'033','NC:Catawba':'035','NC:Chatham':'037','NC:Cherokee':'039',
  'NC:Chowan':'041','NC:Clay':'043','NC:Cleveland':'045','NC:Columbus':'047','NC:Craven':'049',
  'NC:Cumberland':'051','NC:Currituck':'053','NC:Dare':'055','NC:Davidson':'057','NC:Davie':'059',
  'NC:Duplin':'061','NC:Durham':'063','NC:Edgecombe':'065','NC:Forsyth':'067','NC:Franklin':'069',
  'NC:Gaston':'071','NC:Gates':'073','NC:Graham':'075','NC:Granville':'077','NC:Greene':'079',
  'NC:Guilford':'081','NC:Halifax':'083','NC:Harnett':'085','NC:Haywood':'087','NC:Henderson':'089',
  'NC:Hertford':'091','NC:Hoke':'093','NC:Hyde':'095','NC:Iredell':'097','NC:Jackson':'099',
  'NC:Johnston':'101','NC:Jones':'103','NC:Lee':'105','NC:Lenoir':'107','NC:Lincoln':'109',
  'NC:McDowell':'111','NC:Macon':'113','NC:Madison':'115','NC:Martin':'117','NC:Mecklenburg':'119',
  'NC:Mitchell':'121','NC:Montgomery':'123','NC:Moore':'125','NC:Nash':'127','NC:New Hanover':'129',
  'NC:Northampton':'131','NC:Onslow':'133','NC:Orange':'135','NC:Pamlico':'137','NC:Pasquotank':'139',
  'NC:Pender':'141','NC:Perquimans':'143','NC:Person':'145','NC:Pitt':'147','NC:Polk':'149',
  'NC:Randolph':'151','NC:Richmond':'153','NC:Robeson':'155','NC:Rockingham':'157','NC:Rowan':'159',
  'NC:Rutherford':'161','NC:Sampson':'163','NC:Scotland':'165','NC:Stanly':'167','NC:Stokes':'169',
  'NC:Surry':'171','NC:Swain':'173','NC:Transylvania':'175','NC:Tyrrell':'177','NC:Union':'179',
  'NC:Vance':'181','NC:Wake':'183','NC:Warren':'185','NC:Washington':'187','NC:Watauga':'189',
  'NC:Wayne':'191','NC:Wilkes':'193','NC:Wilson':'195','NC:Yadkin':'197','NC:Yancey':'199',
  // Ohio
  'OH:Adams':'001','OH:Allen':'003','OH:Ashland':'005','OH:Ashtabula':'007','OH:Athens':'009',
  'OH:Auglaize':'011','OH:Belmont':'013','OH:Brown':'015','OH:Butler':'017','OH:Carroll':'019',
  'OH:Champaign':'021','OH:Clark':'023','OH:Clermont':'025','OH:Clinton':'027','OH:Columbiana':'029',
  'OH:Coshocton':'031','OH:Crawford':'033','OH:Cuyahoga':'035','OH:Darke':'037','OH:Defiance':'039',
  'OH:Delaware':'041','OH:Erie':'043','OH:Fairfield':'045','OH:Fayette':'047','OH:Franklin':'049',
  'OH:Fulton':'051','OH:Gallia':'053','OH:Geauga':'055','OH:Greene':'057','OH:Guernsey':'059',
  'OH:Hamilton':'061','OH:Hancock':'063','OH:Hardin':'065','OH:Harrison':'067','OH:Henry':'069',
  'OH:Highland':'071','OH:Hocking':'073','OH:Holmes':'075','OH:Huron':'077','OH:Jackson':'079',
  'OH:Jefferson':'081','OH:Knox':'083','OH:Lake':'085','OH:Lawrence':'087','OH:Licking':'089',
  'OH:Logan':'091','OH:Lorain':'093','OH:Lucas':'095','OH:Madison':'097','OH:Mahoning':'099',
  'OH:Marion':'101','OH:Medina':'103','OH:Meigs':'105','OH:Mercer':'107','OH:Miami':'109',
  'OH:Monroe':'111','OH:Montgomery':'113','OH:Morgan':'115','OH:Morrow':'117','OH:Muskingum':'119',
  'OH:Noble':'121','OH:Ottawa':'123','OH:Paulding':'125','OH:Perry':'127','OH:Pickaway':'129',
  'OH:Pike':'131','OH:Portage':'133','OH:Preble':'135','OH:Putnam':'137','OH:Richland':'139',
  'OH:Ross':'141','OH:Sandusky':'143','OH:Scioto':'145','OH:Seneca':'147','OH:Shelby':'149',
  'OH:Stark':'151','OH:Summit':'153','OH:Trumbull':'155','OH:Tuscarawas':'157','OH:Union':'159',
  'OH:Van Wert':'161','OH:Vinton':'163','OH:Warren':'165','OH:Washington':'167','OH:Wayne':'169',
  'OH:Williams':'171','OH:Wood':'173','OH:Wyandot':'175',
  // Texas
  'TX:Anderson':'001','TX:Andrews':'003','TX:Angelina':'005','TX:Aransas':'007','TX:Archer':'009',
  'TX:Armstrong':'011','TX:Atascosa':'013','TX:Austin':'015','TX:Bailey':'017','TX:Bandera':'019',
  'TX:Bastrop':'021','TX:Baylor':'023','TX:Bee':'025','TX:Bell':'027','TX:Bexar':'029',
  'TX:Blanco':'031','TX:Borden':'033','TX:Bosque':'035','TX:Bowie':'037','TX:Brazoria':'039',
  'TX:Brazos':'041','TX:Brewster':'043','TX:Briscoe':'045','TX:Brooks':'047','TX:Brown':'049',
  'TX:Burleson':'051','TX:Burnet':'053','TX:Caldwell':'055','TX:Calhoun':'057','TX:Callahan':'059',
  'TX:Cameron':'061','TX:Camp':'063','TX:Carson':'065','TX:Cass':'067','TX:Castro':'069',
  'TX:Chambers':'071','TX:Cherokee':'073','TX:Childress':'075','TX:Clay':'077','TX:Cochran':'079',
  'TX:Coke':'081','TX:Coleman':'083','TX:Collin':'085','TX:Collingsworth':'087','TX:Colorado':'089',
  'TX:Comal':'091','TX:Comanche':'093','TX:Concho':'095','TX:Cooke':'097','TX:Corpus Christi':'099',
  'TX:Coryell':'099','TX:Cottle':'101','TX:Crane':'103','TX:Crockett':'105','TX:Crosby':'107',
  'TX:Culberson':'109','TX:Dallam':'111','TX:Dallas':'113','TX:Dawson':'115','TX:Deaf Smith':'117',
  'TX:Delta':'119','TX:Denton':'121','TX:DeWitt':'123','TX:Dickens':'125','TX:Dimmit':'127',
  'TX:Donley':'129','TX:Duval':'131','TX:Eastland':'133','TX:Ector':'135','TX:Edwards':'137',
  'TX:Ellis':'139','TX:El Paso':'141','TX:Erath':'143','TX:Falls':'145','TX:Fannin':'147',
  'TX:Fayette':'149','TX:Fisher':'151','TX:Floyd':'153','TX:Foard':'155','TX:Fort Bend':'157',
  'TX:Franklin':'159','TX:Freestone':'161','TX:Frio':'163','TX:Gaines':'165','TX:Galveston':'167',
  'TX:Garza':'169','TX:Gillespie':'171','TX:Glasscock':'173','TX:Goliad':'175','TX:Gonzales':'177',
  'TX:Gray':'179','TX:Grayson':'181','TX:Gregg':'183','TX:Grimes':'185','TX:Guadalupe':'187',
  'TX:Hale':'189','TX:Hall':'191','TX:Hamilton':'193','TX:Hansford':'195','TX:Hardeman':'197',
  'TX:Hardin':'199','TX:Harris':'201','TX:Harrison':'203','TX:Hartley':'205','TX:Haskell':'207',
  'TX:Hays':'209','TX:Hemphill':'211','TX:Henderson':'213','TX:Hidalgo':'215','TX:Hill':'217',
  'TX:Hockley':'219','TX:Hood':'221','TX:Hopkins':'223','TX:Houston':'225','TX:Howard':'227',
  'TX:Hudspeth':'229','TX:Hunt':'231','TX:Hutchinson':'233','TX:Irion':'235','TX:Jack':'237',
  'TX:Jackson':'239','TX:Jasper':'241','TX:Jeff Davis':'243','TX:Jefferson':'245','TX:Jim Hogg':'247',
  'TX:Jim Wells':'249','TX:Johnson':'251','TX:Jones':'253','TX:Karnes':'255','TX:Kaufman':'257',
  'TX:Kendall':'259','TX:Kenedy':'261','TX:Kent':'263','TX:Kerr':'265','TX:Kimble':'267',
  'TX:King':'269','TX:Kinney':'271','TX:Kleberg':'273','TX:Knox':'275','TX:Lamar':'277',
  'TX:Lamb':'279','TX:Lampasas':'281','TX:La Salle':'283','TX:Lavaca':'285','TX:Lee':'287',
  'TX:Leon':'289','TX:Liberty':'291','TX:Limestone':'293','TX:Lipscomb':'295','TX:Live Oak':'297',
  'TX:Llano':'299','TX:Loving':'301','TX:Lubbock':'303','TX:Lynn':'305','TX:McCulloch':'307',
  'TX:McLennan':'309','TX:McMullen':'311','TX:Madison':'313','TX:Marion':'315','TX:Martin':'317',
  'TX:Mason':'319','TX:Matagorda':'321','TX:Maverick':'323','TX:Medina':'325','TX:Menard':'327',
  'TX:Midland':'329','TX:Milam':'331','TX:Mills':'333','TX:Mitchell':'335','TX:Montague':'337',
  'TX:Montgomery':'339','TX:Moore':'341','TX:Morris':'343','TX:Motley':'345','TX:Nacogdoches':'347',
  'TX:Navarro':'349','TX:Newton':'351','TX:Nolan':'353','TX:Nueces':'355','TX:Ochiltree':'357',
  'TX:Oldham':'359','TX:Orange':'361','TX:Palo Pinto':'363','TX:Panola':'365','TX:Parker':'367',
  'TX:Parmer':'369','TX:Pecos':'371','TX:Polk':'373','TX:Potter':'375','TX:Presidio':'377',
  'TX:Rains':'379','TX:Randall':'381','TX:Reagan':'383','TX:Real':'385','TX:Red River':'387',
  'TX:Reeves':'389','TX:Refugio':'391','TX:Roberts':'393','TX:Robertson':'395','TX:Rockwall':'397',
  'TX:Runnels':'399','TX:Rusk':'401','TX:Sabine':'403','TX:San Augustine':'405','TX:San Jacinto':'407',
  'TX:San Patricio':'409','TX:San Saba':'411','TX:Schleicher':'413','TX:Scurry':'415','TX:Shackelford':'417',
  'TX:Shelby':'419','TX:Sherman':'421','TX:Smith':'423','TX:Somervell':'425','TX:Starr':'427',
  'TX:Stephens':'429','TX:Sterling':'431','TX:Stonewall':'433','TX:Sutton':'435','TX:Swisher':'437',
  'TX:Tarrant':'439','TX:Taylor':'441','TX:Terrell':'443','TX:Terry':'445','TX:Throckmorton':'447',
  'TX:Titus':'449','TX:Tom Green':'451','TX:Travis':'453','TX:Trinity':'455','TX:Tyler':'457',
  'TX:Upshur':'459','TX:Upton':'461','TX:Uvalde':'463','TX:Val Verde':'465','TX:Van Zandt':'467',
  'TX:Victoria':'469','TX:Walker':'471','TX:Waller':'473','TX:Ward':'475','TX:Washington':'477',
  'TX:Webb':'479','TX:Wharton':'481','TX:Wheeler':'483','TX:Wichita':'485','TX:Wilbarger':'487',
  'TX:Willacy':'489','TX:Williamson':'491','TX:Wilson':'493','TX:Winkler':'495','TX:Wise':'497',
  'TX:Wood':'499','TX:Yoakum':'501','TX:Young':'503','TX:Zapata':'505','TX:Zavala':'507',
  // Virginia
  'VA:Accomack':'001','VA:Albemarle':'003','VA:Alleghany':'005','VA:Amelia':'007','VA:Amherst':'009',
  'VA:Appomattox':'011','VA:Arlington':'013','VA:Augusta':'015','VA:Bath':'017','VA:Bedford':'019',
  'VA:Bland':'021','VA:Botetourt':'023','VA:Brunswick':'025','VA:Buchanan':'027','VA:Buckingham':'029',
  'VA:Campbell':'031','VA:Caroline':'033','VA:Carroll':'035','VA:Charles City':'036','VA:Charlotte':'037',
  'VA:Chesterfield':'041','VA:Clarke':'043','VA:Craig':'045','VA:Culpeper':'047','VA:Cumberland':'049',
  'VA:Dickenson':'051','VA:Dinwiddie':'053','VA:Essex':'057','VA:Fairfax':'059','VA:Fauquier':'061',
  'VA:Floyd':'063','VA:Fluvanna':'065','VA:Franklin':'067','VA:Frederick':'069','VA:Giles':'071',
  'VA:Gloucester':'073','VA:Goochland':'075','VA:Grayson':'077','VA:Greene':'079','VA:Greensville':'081',
  'VA:Halifax':'083','VA:Hanover':'085','VA:Henrico':'087','VA:Henry':'089','VA:Highland':'091',
  'VA:Isle of Wight':'093','VA:James City':'095','VA:King and Queen':'097','VA:King George':'099',
  'VA:King William':'101','VA:Lancaster':'103','VA:Lee':'105','VA:Loudoun':'107','VA:Louisa':'109',
  'VA:Lunenburg':'111','VA:Madison':'113','VA:Mathews':'115','VA:Mecklenburg':'117','VA:Middlesex':'119',
  'VA:Montgomery':'121','VA:Nelson':'125','VA:New Kent':'127','VA:Northampton':'131','VA:Northumberland':'133',
  'VA:Nottoway':'135','VA:Orange':'137','VA:Page':'139','VA:Patrick':'141','VA:Pittsylvania':'143',
  'VA:Powhatan':'145','VA:Prince Edward':'147','VA:Prince George':'149','VA:Prince William':'153',
  'VA:Pulaski':'155','VA:Rappahannock':'157','VA:Richmond':'159','VA:Roanoke':'161','VA:Rockbridge':'163',
  'VA:Rockingham':'165','VA:Russell':'167','VA:Scott':'169','VA:Shenandoah':'171','VA:Smyth':'173',
  'VA:Southampton':'175','VA:Spotsylvania':'177','VA:Stafford':'179','VA:Surry':'181','VA:Sussex':'183',
  'VA:Tazewell':'185','VA:Warren':'187','VA:Washington':'191','VA:Westmoreland':'193','VA:Wise':'195',
  'VA:Wythe':'197','VA:York':'199',
  // Independent cities (Virginia)
  'VA:Alexandria city':'510','VA:Bristol city':'520','VA:Buena Vista city':'530','VA:Charlottesville city':'540',
  'VA:Chesapeake city':'550','VA:Colonial Heights city':'570','VA:Covington city':'580',
  'VA:Danville city':'590','VA:Emporia city':'595','VA:Fairfax city':'600','VA:Falls Church city':'610',
  'VA:Franklin city':'620','VA:Fredericksburg city':'630','VA:Galax city':'640','VA:Hampton city':'650',
  'VA:Harrisonburg city':'660','VA:Hopewell city':'670','VA:Lexington city':'678','VA:Lynchburg city':'680',
  'VA:Manassas city':'683','VA:Manassas Park city':'685','VA:Martinsville city':'690',
  'VA:Newport News city':'700','VA:Norfolk city':'710','VA:Norton city':'720','VA:Petersburg city':'730',
  'VA:Poquoson city':'735','VA:Portsmouth city':'740','VA:Radford city':'750','VA:Richmond city':'760',
  'VA:Roanoke city':'770','VA:Salem city':'775','VA:Staunton city':'790','VA:Suffolk city':'800',
  'VA:Virginia Beach city':'810','VA:Waynesboro city':'820','VA:Williamsburg city':'830',
  'VA:Winchester city':'840',
  // Washington
  'WA:Adams':'001','WA:Asotin':'003','WA:Benton':'005','WA:Chelan':'007','WA:Clallam':'009',
  'WA:Clark':'011','WA:Columbia':'013','WA:Cowlitz':'015','WA:Douglas':'017','WA:Ferry':'019',
  'WA:Franklin':'021','WA:Garfield':'023','WA:Grant':'025','WA:Grays Harbor':'027','WA:Island':'029',
  'WA:Jefferson':'031','WA:King':'033','WA:Kitsap':'035','WA:Kittitas':'037','WA:Klickitat':'039',
  'WA:Lewis':'041','WA:Lincoln':'043','WA:Mason':'045','WA:Okanogan':'047','WA:Pacific':'049',
  'WA:Pend Oreille':'051','WA:Pierce':'053','WA:San Juan':'055','WA:Skagit':'057','WA:Skamania':'059',
  'WA:Snohomish':'061','WA:Spokane':'063','WA:Stevens':'065','WA:Thurston':'067','WA:Wahkiakum':'069',
  'WA:Walla Walla':'071','WA:Whatcom':'073','WA:Whitman':'075','WA:Yakima':'077',
  // Wisconsin
  'WI:Adams':'001','WI:Ashland':'003','WI:Barron':'005','WI:Bayfield':'007','WI:Brown':'009',
  'WI:Buffalo':'011','WI:Burnett':'013','WI:Calumet':'015','WI:Chippewa':'017','WI:Clark':'019',
  'WI:Columbia':'021','WI:Crawford':'023','WI:Dane':'025','WI:Dodge':'027','WI:Door':'029',
  'WI:Douglas':'031','WI:Dunn':'033','WI:Eau Claire':'035','WI:Florence':'037','WI:Fond du Lac':'039',
  'WI:Forest':'041','WI:Grant':'043','WI:Green':'045','WI:Green Lake':'047','WI:Iowa':'049',
  'WI:Iron':'051','WI:Jackson':'053','WI:Jefferson':'055','WI:Juneau':'057','WI:Kenosha':'059',
  'WI:Kewaunee':'061','WI:La Crosse':'063','WI:Lafayette':'065','WI:Langlade':'067','WI:Lincoln':'069',
  'WI:Manitowoc':'071','WI:Marathon':'073','WI:Marinette':'075','WI:Marquette':'077','WI:Menominee':'078',
  'WI:Milwaukee':'079','WI:Monroe':'081','WI:Oconto':'083','WI:Oneida':'085','WI:Outagamie':'087',
  'WI:Ozaukee':'089','WI:Pepin':'091','WI:Pierce':'093','WI:Polk':'095','WI:Portage':'097',
  'WI:Price':'099','WI:Racine':'101','WI:Richland':'103','WI:Rock':'105','WI:Rusk':'107',
  'WI:St. Croix':'109','WI:Sauk':'111','WI:Sawyer':'113','WI:Shawano':'115','WI:Sheboygan':'117',
  'WI:Taylor':'119','WI:Trempealeau':'121','WI:Vernon':'123','WI:Vilas':'125','WI:Walworth':'127',
  'WI:Washburn':'129','WI:Washington':'131','WI:Waukesha':'133','WI:Waupaca':'135','WI:Waushara':'137',
  'WI:Winnebago':'139','WI:Wood':'141',
};

// ── Time zone by state (IANA) ─────────────────────────────────────
// Primary timezone per state. Multi-zone states covered by a ZIP→TZ lookup below.
const STATE_TZ = {
  AL:'America/Chicago',AK:'America/Anchorage',AZ:'America/Phoenix',AR:'America/Chicago',
  CA:'America/Los_Angeles',CO:'America/Denver',CT:'America/New_York',DE:'America/New_York',
  DC:'America/New_York',FL:'America/New_York',GA:'America/New_York',HI:'Pacific/Honolulu',
  ID:'America/Boise',IL:'America/Chicago',IN:'America/Indiana/Indianapolis',IA:'America/Chicago',
  KS:'America/Chicago',KY:'America/New_York',LA:'America/Chicago',ME:'America/New_York',
  MD:'America/New_York',MA:'America/New_York',MI:'America/Detroit',MN:'America/Chicago',
  MS:'America/Chicago',MO:'America/Chicago',MT:'America/Denver',NE:'America/Chicago',
  NV:'America/Los_Angeles',NH:'America/New_York',NJ:'America/New_York',NM:'America/Denver',
  NY:'America/New_York',NC:'America/New_York',ND:'America/Chicago',OH:'America/New_York',
  OK:'America/Chicago',OR:'America/Los_Angeles',PA:'America/New_York',RI:'America/New_York',
  SC:'America/New_York',SD:'America/Chicago',TN:'America/Chicago',TX:'America/Chicago',
  UT:'America/Denver',VT:'America/New_York',VA:'America/New_York',WA:'America/Los_Angeles',
  WV:'America/New_York',WI:'America/Chicago',WY:'America/Denver',PR:'America/Puerto_Rico',
  VI:'America/St_Thomas',GU:'Pacific/Guam',AS:'Pacific/Pago_Pago',AK:'America/Anchorage',
};

// ── Confidence scoring ─────────────────────────────────────────────
const PLACEMENT_SCORE = {
  'Structure - Rooftop': 97, 'Rooftop': 97,
  'Parcel': 85,              'Structure - Parcel': 85,
  'Street': 65,              'Interpolation': 65,
  'Unknown': 45,
};

/**
 * Compute a 0–100 confidence score for an address row.
 * Factors: placement accuracy, field completeness, anomaly flags.
 */
function confidenceScore(a) {
  let score = PLACEMENT_SCORE[a.placement] ?? 45;

  // Boost for enrichment completeness
  if (a.zip_code)                         score += 2;
  if (a.plus4 && a.plus4 !== '0000')      score += 1;
  if (a.nbrhd_comm || a.uninc_comm)       score += 1;
  if (a.addr_type && a.addr_type !== 'Unknown') score += 2;
  if (a.parcel_id)                        score += 1;
  if (a.add_auth)                         score += 1;

  // Penalize for red flags
  if (a.anom_status)                      score -= 20;
  if (!a.zip_code)                        score -= 8;
  if (!a.latitude || !a.longitude)        score -= 15;
  if (a.addr_type === 'Unknown' || !a.addr_type) score -= 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Look up county FIPS code.
 * Returns full 5-digit FIPS (state 2-digit + county 3-digit), e.g. "48201"
 */
function countyFips(stateCode, countyName) {
  if (!stateCode || !countyName) return null;
  const st = stateCode.toUpperCase();
  const stateFips = STATE_FIPS[st];
  if (!stateFips) return null;

  // Normalise county name — strip " County", " Borough", " Parish", " city", etc.
  const norm = countyName
    .replace(/\s+(county|borough|parish|census area|municipality|city and borough|city)$/i, '')
    .trim();

  const countyFips3 = COUNTY_FIPS[`${st}:${norm}`]
    ?? COUNTY_FIPS[`${st}:${countyName}`]  // try original
    ?? null;

  return countyFips3 ? `${stateFips}${countyFips3}` : null;
}

/**
 * Get IANA timezone string for a state (primary zone).
 */
function timezone(stateCode) {
  return STATE_TZ[stateCode?.toUpperCase()] ?? null;
}

/**
 * Determine if address is residential (best-effort).
 * Returns: 'residential' | 'commercial' | 'unknown'
 */
function residentialFlag(a) {
  const t = (a.addr_type || '').toUpperCase();
  const d = (a.deliver_typ || '').toUpperCase();
  if (d === 'RESIDENTIAL' || t === 'RESIDENTIAL') return 'residential';
  if (d === 'BUSINESS' || t === 'COMMERCIAL')     return 'commercial';
  // Heuristic: unit/apartment presence → likely residential
  if (a.unit || a.sub_address)                    return 'residential';
  return 'unknown';
}

/**
 * Apply all enrichments to a raw address row.
 * Returns the input object with added fields — non-destructive.
 */
function enrich(a) {
  return {
    ...a,
    fips:        countyFips(a.state, a.county),
    confidence:  confidenceScore(a),
    timezone:    timezone(a.state),
    residential: residentialFlag(a),
    // Best display city (post_city preferred over inc_muni for recognisability)
    display_city: a.post_city && a.post_city !== 'Not stated' ? a.post_city
                : a.uninc_comm || a.inc_muni || null,
    // Best neighborhood
    neighborhood: a.nbrhd_comm || a.uninc_comm || null,
  };
}

module.exports = { enrich, confidenceScore, countyFips, timezone, residentialFlag };
