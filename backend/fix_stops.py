import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'spis_castle_paid')

print(f"Connecting to DB: {DB_NAME}")
c = MongoClient(MONGO_URL)
col = c[DB_NAME].tour_stops

fixes = {
    8: [
        ('de','Unterer Burghof','15th century courtyard','Lower courtyard built by Jan Jiskra mid-15th century. Walls 7-9m high. Right tower: torture chamber exhibition.'),
        ('pl','Dolny dziedziniec','Najmlodszy dziedziniec zamku','Dolny dziedziniec zbudowany przez Jana Jiskre w polowie XV w. Mury 7-9m. Prawa wieza: izba tortur.'),
        ('hu','Also udvar','A var legfiatalabb resze','Az also udvart Jan Jiskra epitette a 15. szazad kozepen. Falak 7-9m. Jobb torony: kinzokamra.'),
        ('fr','Cour inferieure','La partie la plus recente du chateau','Cour inferieure construite par Jan Jiskra au XVe siecle. Murs 7-9m. Tour droite: chambre de torture.'),
        ('es','Patio inferior','La parte mas reciente del castillo','Patio inferior construido por Jan Jiskra en el siglo XV. Muros 7-9m. Torre derecha: camara de tortura.'),
        ('ru','Nizhniy dvor','Samaya molodaya chast zamka','Nizhniy dvor postroil Jan Yiskra v seredine XV veka. Steny 7-9m. Pravaya bashnya: pytochnaya kamera.'),
        ('zh','Xia yuan','Cheng bao zui xin bu fen','Xia yuan zai 15 shi ji zhong qi you Jan Jiskra jian zao. Qiang gao 7-9 mi. You ta: ku xing shi.'),
    ],
    11: [
        ('de','Der Turm Nebojsa','Letzte Zuflucht der Burgverteidiger','19m Turm Nebojsa in der Mitte der Akropolis. 5 Stockwerke. Treppenhaus dreht sich am Ende. WC aus dem 13. Jh. Zisterne sammelte Regenwasser.'),
        ('pl','Wieza Nebojsa','Ostatnie schronienie obroncow zamku','19m wieza Nebojsa w centrum akropolu. 5 kondygnacji. Schody zmieniaja kierunek na koncu. Toaleta z XIII w. Cysterna zbierala deszczowke.'),
        ('hu','A torony Nebojsa','A var vedoinek utolso menedeke','19m torony Nebojsa az akropolisz kozepen. 5 emelet. Lepcso iranya megvaltozott a vegen. 13. szazadi toalett. Sziklaciszterna esovizet gyujtott.'),
        ('fr','La tour Nebojsa','Dernier refuge des defenseurs','Tour 19m Nebojsa au centre de l acropole. 5 etages. Escalier tourne a la fin. Toilettes du XIIIe siecle. Citerne dans le roc.'),
        ('es','La torre Nebojsa','Ultimo refugio de los defensores','Torre 19m Nebojsa en el centro de la acropolis. 5 plantas. La escalera gira al final. Retrete del siglo XIII. Cisterna en la roca.'),
        ('ru','Bashnya Neboysha','Poslednee ubezhishche zashchitnikov','19m bashnya Neboysha v tsentre akropolya. 5 etazhey. Lestnitsa menyayet napravlenie. Tualet XIII veka. Tsisterna sobirala vodu.'),
        ('zh','Ta lou Nei bo ya sa','Shou wei zhe de zui hou bi nan suo','19mi ta lou Nei bo ya sa zai wei cheng zhong yang. 5 ceng. Lou ti mo duan gai bian fang xiang. 13 shi ji de ce suo. Shui chi shou ji yu shui.'),
    ],
    12: [
        ('de','Romanischer Palast','Einer von nur 4 weltlichen romanischen Palaesten weltweit','Massiver dreigeschossiger romanischer Palast, einer von nur 4 erhaltenen weltlichen romanischen Palaesten weltweit. Ein weiterer befindet sich in Merano, Italien. Der Spis Span lebte hier. Im ersten Stock ein grosser Saal mit sieben romanischen Fenstern.'),
        ('pl','Palac romanski','Jeden z zaledwie 4 swieckich palacow romanskich na swiecie','Masywny trzypietrowy palac romanski, jeden z 4 na swiecie. Kolejny w Merano we Wloszech. Spis Span mieszkal tu z rodzina. Na pierwszym pietrze duza sala z siedmioma oknami.'),
        ('hu','Roman palota','Egyike a vilag 4 vilagi roman palotajanak','Hatalmas haromszintes roman palota, egyike a vilag 4 megorzott vilagi roman palotajanak. Egy masik Meranaban. A Spis Span itt elt. Elso emelet: nagy terem het roman ablakkal.'),
        ('fr','Palais roman','L un des 4 palais romans seculiers preserves dans le monde','Massif palais roman a trois etages, l un des 4 palais romans seculiers preserves dans le monde. Un autre a Merano, Italie. Le Spis Span vivait ici. Premier etage: grande salle eclairee par sept fenetres romanes.'),
        ('es','Palacio romanico','Uno de solo 4 palacios romanicos seculares en el mundo','Macizo palacio romanico de tres plantas, uno de 4 en el mundo. Otro en Merano, Italia. El Spis Span vivia aqui. Primer piso: gran sala iluminada por siete ventanas romanicas.'),
        ('ru','Romanskiy dvorets','Odin iz vsego 4 svetskikh romanskikh dvortsov v mire','Massivnyy trekhetazhnyy romanskiy dvorets, odin iz 4 v mire. Drugoy v Merano, Italiya. Spis Span zhil zdes. Pervyy etazh: bolshoy zal s semyu romanskimi oknami.'),
        ('zh','Luo ma shi gong dian','Shi jie shang jin cun 4 zuo shi su luo ma shi gong dian zhi yi','Xiong wei san ceng luo ma shi gong dian, shi jie shang jin cun 4 zuo zhi yi. Ling yi zuo zai Mei la nuo. Spis Span zhu zai zhe li. Yi lou: da ting you 7 ge luo ma shi chuang hu.'),
    ],
}

for sn, langs in fixes.items():
    s = col.find_one({'stop_number': sn})
    if not s:
        print(f'Stop {sn} not found!')
        continue
    ex = {t['language_code']: t for t in s.get('translations', [])}
    for lc, ti, sh, de in langs:
        if lc not in ex:
            ex[lc] = {'language_code': lc, 'audio_url': None, 'video_url': None, 'vr_url': None}
        ex[lc].update({'title': ti, 'short_description': sh, 'description': de})
    r = col.update_one({'stop_number': sn}, {'$set': {'translations': list(ex.values())}})
    print(f'Stop {sn}: updated {r.modified_count}')

c.close()
print('All done!')
