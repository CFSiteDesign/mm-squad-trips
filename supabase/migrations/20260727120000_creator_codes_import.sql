-- Applied via Lovable MCP on 2026-07-27 (guards make re-runs no-ops).
-- ALL IN Trips creator affiliate codes (Lexie's list, 27 Jul 2026): 321 codes.
-- $0 tracking codes — guest pays full price, gets 2 free hostel nights + one prize
-- draw entry (prize matches the trip length booked); creator earns $25 (7-day) /
-- $50 (12+ day) per booking, confirmed once the final trip payment lands.
-- NO EXPIRY: ALL IN is a permanent commission category. Only the three partner
-- codes (YELLOW/CODE/LYLO 4MADMONKEY) keep their 15 Sep 2026 expiry.
-- TEST10 / TESTT10 deliberately excluded.
alter table public.discount_codes add column if not exists creator_email text;
alter table public.discount_codes add column if not exists creator_ref text;

-- Codes with no creator details on file (code is the only identifier we have).
insert into public.discount_codes
  (code, discount_amount, discount_type, active, applicable_to, expiry_date,
   is_creator, commission_7day, commission_12day)
select c, 0, 'fixed', true, array['All']::text[], null::date, true, 25, 50
from unnest(array[
  'AARON10','AARONM10','ADAM10','ADAMA10','ADAMB10','AILEEN10','ALEIX10','ALEKS10','ALESSIA10','ALEXIS10',
  'AMANDA10','AMBER10','AMINA10','AMY10','ANA10','ANDREW10','ANGELINA10','ANGEREEN10','ANNA10','ANNAA10',
  'ANNALISA10','ANNALYN10','ASHLEY10','ASHLEYA10','ASIF10','ATHERIUM10','BAILEY10','BOBBY10','BORI10','BRADLEY10',
  'BRITTANY10','BRIX10','BROOK10','BROOKEF10','BROOKLYNN10','CAMC10','CARLO10','CASSIE10','CATH10','CELIA10',
  'CERI10','CERYN10','CHARFAGAN10','CHARLIE10','CHARLIEG10','CHARLOTTE10','CHARLY10','CHARMILYN10','CHEDHEL10','CHIARA10',
  'CHINI10','CINDY10','CLARA10','CONSTANZA10','CORA10','CORY10','DANIELA10','DARIA10','DAVID10','DECLAN10',
  'DECLANS10','DEMIE10','DENNIS10','DONZHAE10','DUNCAN10','DUTCHIES10','DWAYNE10','EDYTA10','ELLA10','ELLAM10',
  'ELLIOTT10','EM10','EMILYM10','EMILYS10','EMMA10','ERIN10','FERNI10','FLORENCE10','FLORIAN10','GIANNA10',
  'GIOVANNI10','GRETA10','GRETCHEN10','GRIFFIN10','GRIFFINW10','HANNAH10','HATTIE10','HAYLEY10','HOLLIE10','HOLLY10',
  'HUNTER10','HUNTERH10','HUONG10','IKRAM10','IMANI10','INTEZAAR10','IONA10','ISABELL10','IZZY10','JAMIE10',
  'JANICE10','JANINA10','JASMINE10','JAYA10','JAYDEN10','JAYVIE10','JEA10','JEMERSON10','JENNIFER10','JENNIFERA10',
  'JENNIFERJ10','JENSEN10','JESSA10','JESSICA10','JESUS10','JOE10','JOEL10','JOSHUA10','JUBJANG10','JUDIT10',
  'JUNTIE10','JUSTIN10','JUSTINL10','KARA10','KARINA10','KARLA10','KATIEM10','KATIEN10','KAYA10','KAYLAK10',
  'KAYLEIGH10','KIAYA10','KIMG10','KIMK10','KRISTIAN10','LAURAG10','LAURAL10','LAURAV10','LAURENK10','LAURENMAE10',
  'LAW10','LE10','LEAFLAVY10','LENNOX10','LEWIS10','LEYLA10','LGBTQBPKRS10','LISA10','LOLA10','LORENA10',
  'LORI10','LOUIE10','LOWAN10','LUCAS10','LUKE10','LUKED10','LYDIA10','MADDIE10','MAGGIE10','MAJA10',
  'MANAL10','MARGHE10','MARISSA10','MARIZ10','MARLEYC10','MARTYNA10','MATTHEW10','MATTHEWM10','MEADOW10','MEALYANN10',
  'MIAM10','MIAW10','MIGUEL10','MIGUELA10','MIKAELA10','MILI10','MILLIE10','MILLIEM10','MOLLY10','MONICA10',
  'MORENA10','NAEMI10','NATACHA10','NATALIE10','NATE10','NICOLE10','NIKHIL10','NIKLAS10','NINUTSA10','NITIN10',
  'NITINP10','NITINP11','NITINP12','NOA10','NORA10','NOVA10','OLIVIA10','OLIVIAP10','OLIVIAP11','ORAN10',
  'OWENC10','PARI10','PATRICIA10','PATTI10','PAULA10','PEYTON10','QUEER10','RAQUEL10','RAYMOND10','RISERUN10',
  'ROBERTO10','RONJA10','ROSIE10','ROXANNE10','SALLY10','SAM10','SAMUEL10','SARAH10','SARAHS10','SARAHS11',
  'SARAHS12','SARAJANE10','SARAJANEJ10','SHARMINE10','SHERYLL10','SOFIA10','STACEY10','SUMMER10','TADAMASA10','TAISIIA10',
  'TAJ10','TAN10','TAYLAH10','TGOB10','TIA10','TOMU10','TOMU11','TYLER10','VALERIA10','VASILE10',
  'VICKY10','VIKI10','VINCENZO10','VITTORIO10','VIVIAN10','WAYENN10','WILL10','WILLD10','XUEXIA10','YALDA10',
  'YASMIN10','YLENIA10','YOAN10','ZAPS10'
]) as c
on conflict (code) do update set
  is_creator = true,
  commission_7day  = coalesce(public.discount_codes.commission_7day, 25),
  commission_12day = coalesce(public.discount_codes.commission_12day, 50);

-- Codes with a name / email / Creator Hub ref.
insert into public.discount_codes
  (code, discount_amount, discount_type, active, applicable_to, expiry_date,
   is_creator, creator_name, creator_email, creator_ref, commission_7day, commission_12day)
select v.code::text, 0, 'fixed', true, array['All']::text[], null::date, true,
       v.name::text, v.email::text, v.ref::text, 25, 50
from (values
  ('EMMASDAYDREAM10','Emma','emmasdaydream1@gmail.com','CH001'),('SCRUFF10','scruff_brotherss','boris.saullhunt@icloud.com','CH003'),('ARCHIE10','marleyandarchieofficial',null,'CH004'),
  ('MARLEY10','marleyandarchieofficial',null,'CH005'),('MA10','marleyandarchieofficial',null,'CH006'),('TIFFANY10','Tiffany',null,'CH007'),
  ('MITCH10','mitchsercombe',null,'CH008'),('LIVVY10','thelivvydiaries','livtalpromo@gmail.com','CH009'),('MICAH10','Micah',null,'CH010'),
  ('OWEN10','Owen',null,'CH011'),('KATIE10','Katie Wang','katiewang379@gmail.com','CH012'),('CALLAN10','Callan',null,'CH013'),
  ('CAM10','Camquestons','camerondouglas18@gmail.com','CH014'),('LEE10','blightyyy',null,'CH015'),('JAMES10','JAMES.MCKENNA97','jamesrhysmckenna@gmail.com','CH016'),
  ('VINS10','vinsvdgiesen','vinsvandergiesen@gmail.com','CH017'),('TOM10','travellingtomos','travellingtomos@outlook.com','CH018'),('ALFIE10','alfie','alfie.coe03@gmail.com','CH019'),
  ('APRIL10','april.florence_','aprilflorenceok@gmail.com','CH020'),('HOPE10','Hope Elliott','hopeelliottcollab@gmail.com','CH021'),('BRAD10','bforbes03','bradders2512@gmail.com','CH022'),
  ('TORI10','Tori',null,'CH023'),('BOYDY10','Boydy','kaneboyd2004@outlook.com','CH024'),('CUTTLE10','Cuttle',null,'CH025'),
  ('MOLS10','mollyshepherdx','molstravelss@gmail.com','CH026'),('RAESHEL10','raeshelgoesglobal','raeshel.gg@outlook.com','CH027'),('EDDEN10','_eddenn_',null,'CH028'),
  ('EMILY10','emily.backpacks','emily.backpacks@gmail.com','CH029'),('VICTORIA10','victoriaflatt_',null,'CH030'),('ZSUZSI10','zsuzsipalocz','zsuzsipalocz@gmail.com','CH031'),
  ('LINDSEY10','lindseymjensen','zsuzsipalocz@gmail.com','CH032'),('LAUREN10','laurenhershon6',null,'CH033'),('LAURA10','lauramcastro','laura.mmcastro@hotmail.com','CH034'),
  ('ARIEL10','arielgentry','arielgentrybusiness@gmail.com','CH035'),('ANN10','spartann_tita','anndiosa@gmail.com','CH036'),('ANGELAGINA10','Angela & Gina','angela.gina.ugc@gmail.com','CH037'),
  ('ARIANA10','ariana_simons1','ariana.e.simons@gmail.com','CH038'),('DUDEABROAD10','dudeabroad',null,'CH039'),('BROOKE10','Brooke Goodmann','brookescollabs@gmail.com','CH040'),
  ('MICAH10B','Rei Daniel Gaspar','gasparbookings@gmail.com','CH041'),('CHICKABROAD10','chickabroad_',null,'CH042'),('COLE10','Cole McNamara','colecreatescontent@gmail.com','CH043'),
  ('CHLOE10','jarofhibiscus','chloznic@outlook.com','CH044'),('JIM10','Jim Jimenez','jimjimenez1996@gmail.com','CH045'),('KAYLA10','Kayla Bea','jimjimenez1996@gmail.com','CH046'),
  ('LENNON10','Lennon Carlo','lnncrlogym@gmail.com','CH047'),('FRANCESCO10','Francesco Sercia',null,'CH048'),('KIM10','Kim',null,'CH049'),
  ('LEVI10','Levi De leeuw','livingwlevi@gmail.com','CH050'),('CHARLEY10','Charley Gillam','charleygillamugc@outlook.com','CH051'),('CELINE10','celine jesse','hello@clnjes.com','CH052'),
  ('ITALLIA10','Itallia Dowson','contact.italliadowson@gmail.com','CH053'),('NADINE10','Nadine',null,'CH054'),('LIAM10','Liam',null,'CH055'),
  ('CLAIRE10','Claire',null,'CH056'),('GEORGEB10','George B',null,'CH057'),('GREG10','Greg',null,'CH058'),
  ('OLIVERB10','Oliver B',null,'CH059'),('WILLR10','Will R',null,'CH060'),('CHELSEA10','Chelsea Johnson','chelseaaatravels@gmail.com','CH061'),
  ('EOIN10','Eoin Ruane','eoinruane0@gmail.com','CH062'),('MIA10','Mia Fry','miafry@mail.com','CH063'),('HEIDI10','Heidi Baldwin','heidibeks@aol.com','CH064'),
  ('RISKY10','Risky',null,'CH364'),('WORLDLYROAMING10','WORLDLYROAMING',null,'CH369'),('GLOBALWORKTRAVEL10','GLOBALWORKTRAVEL','ryan@globalworkandtravel.com','CH371'),
  ('JAMIMOY10','Jamie Echano','jamimoy@gmail.com','CH372')
) as v(code,name,email,ref)
on conflict (code) do update set
  is_creator       = true,
  creator_name     = coalesce(excluded.creator_name, public.discount_codes.creator_name),
  creator_email    = coalesce(excluded.creator_email, public.discount_codes.creator_email),
  creator_ref      = coalesce(excluded.creator_ref, public.discount_codes.creator_ref),
  commission_7day  = coalesce(public.discount_codes.commission_7day, 25),
  commission_12day = coalesce(public.discount_codes.commission_12day, 50);
