-- Seed: datos demo para el tenant "noon"
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Requiere que el tenant con slug = 'noon' exista en la tabla tenants

DO $$
DECLARE
  v_tenant_id uuid;
  v_cat_entradas uuid;
  v_cat_principales uuid;
  v_cat_bebidas uuid;
  v_cat_postres uuid;
BEGIN
  -- Obtener el tenant_id del slug 'noon'
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'noon' LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant "noon" no encontrado. Verifica que el registro haya sido creado.';
  END IF;

  RAISE NOTICE 'Tenant ID: %', v_tenant_id;

  -- Actualizar app_config con nombre y descripción
  UPDATE app_config
  SET
    restaurant_name = 'Noon',
    descripcion = 'Cocina de autor. Sabores frescos y creativos.',
    tienda_abierta = true,
    tienda_visible = true,
    metodos_pago_activos = '{"efectivo": true, "tarjeta": true, "transferencia": true}'::jsonb
  WHERE tenant_id = v_tenant_id;

  -- Crear categorías
  INSERT INTO categories (id, tenant_id, name, orden, activa)
  VALUES
    (gen_random_uuid(), v_tenant_id, 'Entradas', 1, true),
    (gen_random_uuid(), v_tenant_id, 'Platos principales', 2, true),
    (gen_random_uuid(), v_tenant_id, 'Bebidas', 3, true),
    (gen_random_uuid(), v_tenant_id, 'Postres', 4, true)
  ON CONFLICT DO NOTHING;

  -- Obtener IDs de las categorías recién creadas
  SELECT id INTO v_cat_entradas      FROM categories WHERE tenant_id = v_tenant_id AND name = 'Entradas'          LIMIT 1;
  SELECT id INTO v_cat_principales   FROM categories WHERE tenant_id = v_tenant_id AND name = 'Platos principales' LIMIT 1;
  SELECT id INTO v_cat_bebidas       FROM categories WHERE tenant_id = v_tenant_id AND name = 'Bebidas'            LIMIT 1;
  SELECT id INTO v_cat_postres       FROM categories WHERE tenant_id = v_tenant_id AND name = 'Postres'            LIMIT 1;

  -- Entradas
  INSERT INTO menu_items (id, tenant_id, category_id, name, descripcion, price, available, orden, mostrar_en_menu_digital)
  VALUES
    (gen_random_uuid(), v_tenant_id, v_cat_entradas, 'Croquetas de jamón', 'Crujientes croquetas con bechamel artesanal y jamón serrano', 8.50, true, 1, true),
    (gen_random_uuid(), v_tenant_id, v_cat_entradas, 'Carpaccio de res', 'Láminas finas de res con rúcula, parmesano y aceite de oliva', 12.00, true, 2, true),
    (gen_random_uuid(), v_tenant_id, v_cat_entradas, 'Ensalada Noon', 'Mix de verdes, aguacate, tomates cherry y vinagreta de mostaza', 9.50, true, 3, true);

  -- Platos principales
  INSERT INTO menu_items (id, tenant_id, category_id, name, descripcion, price, available, orden, mostrar_en_menu_digital)
  VALUES
    (gen_random_uuid(), v_tenant_id, v_cat_principales, 'Pechuga a la plancha', 'Pechuga de pollo marinada con hierbas, puré de papa y ensalada', 18.00, true, 1, true),
    (gen_random_uuid(), v_tenant_id, v_cat_principales, 'Salmón al horno', 'Filete de salmón con mantequilla de eneldo, espárragos y arroz', 24.00, true, 2, true),
    (gen_random_uuid(), v_tenant_id, v_cat_principales, 'Pasta al pesto', 'Linguine con pesto genovés, tomates secos y piñones tostados', 16.00, true, 3, true),
    (gen_random_uuid(), v_tenant_id, v_cat_principales, 'Lomo a la brasa', 'Medallón de res 200g con chimichurri, papas y vegetales grillados', 28.00, true, 4, true);

  -- Bebidas
  INSERT INTO menu_items (id, tenant_id, category_id, name, descripcion, price, available, orden, mostrar_en_menu_digital)
  VALUES
    (gen_random_uuid(), v_tenant_id, v_cat_bebidas, 'Agua mineral', '500ml con o sin gas', 2.50, true, 1, true),
    (gen_random_uuid(), v_tenant_id, v_cat_bebidas, 'Limonada natural', 'Limonada casera con menta y jengibre', 4.00, true, 2, true),
    (gen_random_uuid(), v_tenant_id, v_cat_bebidas, 'Jugo de frutas', 'Naranja, mango o maracuyá. Natural y sin azúcar añadida', 5.00, true, 3, true),
    (gen_random_uuid(), v_tenant_id, v_cat_bebidas, 'Vino de la casa', 'Copa de vino tinto o blanco. Selección del sommelier', 8.00, true, 4, true),
    (gen_random_uuid(), v_tenant_id, v_cat_bebidas, 'Café expreso', 'Doble shot de café de origen', 3.00, true, 5, true);

  -- Postres
  INSERT INTO menu_items (id, tenant_id, category_id, name, descripcion, price, available, orden, mostrar_en_menu_digital)
  VALUES
    (gen_random_uuid(), v_tenant_id, v_cat_postres, 'Tiramisú', 'Clásico italiano con mascarpone, café y cacao', 7.00, true, 1, true),
    (gen_random_uuid(), v_tenant_id, v_cat_postres, 'Brownie con helado', 'Brownie de chocolate caliente con bola de vainilla y caramelo', 8.00, true, 2, true),
    (gen_random_uuid(), v_tenant_id, v_cat_postres, 'Panna cotta de frutos rojos', 'Cremosa panna cotta con coulis de berries frescos', 6.50, true, 3, true);

  RAISE NOTICE '✓ Seed completado: 3 categorías, 14 ítems insertados para tenant %', v_tenant_id;
END $$;
