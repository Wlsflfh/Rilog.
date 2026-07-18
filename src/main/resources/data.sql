INSERT INTO users (
    id,
    nickname,
    username,
    email,
    profile_image_url,
    provider,
    provider_subject,
    created_at,
    updated_at
) VALUES (
             1,
             '진리로',
             'jinriro',
             'wlsflfh@gmail.com',
             'https://www.example.com/profile/jinriro.png',
             'LOCAL',
             'wlsflfh@gmail.com',
             NOW(6),
             NOW(6)
         );
