-- Board listesi sırası (sütun/kart ile aynı float position modeli)
alter table boards
  add column position double precision not null default 1000;

-- Mevcut kayıtlar: kullanıcı başına created_at artan → position 1000, 2000, …
-- Liste created_at desc idi; position desc ile aynı görünüm (en yeni en büyük position)
update boards b
set position = sub.p
from (
  select
    id,
    (row_number() over (partition by user_id order by created_at asc))::double precision * 1000 as p
  from boards
) sub
where b.id = sub.id;
