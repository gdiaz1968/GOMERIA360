
const pool = require("../db");

// =====================================================
// OBTENER TIPOS DE TRABAJO ACTIVOS
// =====================================================

async function obtenerTiposTrabajo() {
  const resultado = await pool.query(`
    SELECT id, descripcion
    FROM tipos_trabajo
    WHERE activo = TRUE
    ORDER BY descripcion
  `);

  return resultado.rows;
}

// =====================================================
// REGISTRAR VISITA Y SUS TRABAJOS
// =====================================================

async function crearVisita(datos) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verificar que todos los trabajos estén activos.
    const idsTipos = [
      ...new Set(
        datos.detalles.map(item => String(item.id_tipo_trabajo))
      )
    ];

    const tipos = await client.query(
      `SELECT id
       FROM tipos_trabajo
       WHERE activo = TRUE
         AND id = ANY($1::bigint[])`,
      [idsTipos]
    );

    if (tipos.rows.length !== idsTipos.length) {
      const error = new Error(
        "Uno o más tipos de trabajo no existen o están inactivos"
      );
      error.status = 400;
      throw error;
    }

    // Insertar cabecera de visita.
    const visitaResultado = await client.query(
      `INSERT INTO visitas (
          ubicacion,
          patente,
          tipo_vehiculo,
          observaciones,
          id_usuario,
          id_cliente,
          nombre_cliente_contacto,
          whatsapp_contacto
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, fecha_hora, ubicacion`,
      [
        datos.ubicacion,
        datos.patente,
        datos.tipo_vehiculo,
        datos.observaciones,
        datos.id_usuario,
        datos.id_cliente,
        datos.nombre_cliente_contacto,
        datos.whatsapp_contacto
      ]
    );

    const visita = visitaResultado.rows[0];

    // Insertar cada trabajo de la visita.
    for (const detalle of datos.detalles) {
      await client.query(
        `INSERT INTO visitas_detalle (
            id_visita,
            id_tipo_trabajo,
            observacion,
            importe,
            estado_pago
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          visita.id,
          detalle.id_tipo_trabajo,
          detalle.observacion,
          detalle.importe,
          detalle.estado_pago
        ]
      );
    }

    await client.query("COMMIT");

    return visita;

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;

  } finally {
    client.release();
  }
}

// =====================================================
// LISTAR VISITAS
// La dueña consulta todas.
// Los operadores solamente las propias.
// =====================================================

async function listarVisitas(usuario, filtros) {
  const resultado = await pool.query(
    `SELECT
        v.id,
        v.fecha_hora,
        v.ubicacion,
        v.patente,
        v.tipo_vehiculo,
        v.observaciones,
        v.nombre_cliente_contacto,
        v.whatsapp_contacto,
        u.nombre AS operador,

        COALESCE(detalles.trabajos, '[]'::json)
          AS trabajos,

        COALESCE(detalles.total, 0)
          AS total

     FROM visitas v

     INNER JOIN usuarios u
       ON u.id = v.id_usuario

     LEFT JOIN LATERAL (
       SELECT
         json_agg(
           json_build_object(
             'id', vd.id,
             'id_tipo_trabajo', vd.id_tipo_trabajo,
             'descripcion', tt.descripcion,
             'observacion', vd.observacion,
             'importe', vd.importe,
             'estado_pago', vd.estado_pago
           )
           ORDER BY vd.id
         ) AS trabajos,

         SUM(vd.importe) AS total

       FROM visitas_detalle vd

       INNER JOIN tipos_trabajo tt
         ON tt.id = vd.id_tipo_trabajo

       WHERE vd.id_visita = v.id
     ) detalles ON TRUE

     WHERE
       ($1::varchar = 'ADMINISTRADOR' OR v.id_usuario = $2)
       AND ($3::varchar IS NULL OR v.ubicacion = $3)

     ORDER BY v.fecha_hora DESC

     LIMIT $4 OFFSET $5`,
    [
      usuario.rol,
      usuario.id,
      filtros.ubicacion || null,
      filtros.limite,
      filtros.offset
    ]
  );

  return resultado.rows;
}

// =====================================================
// RESUMEN DEL DASHBOARD
// Exclusivo de la dueña.
// Fecha calculada con horario argentino.
// =====================================================


async function obtenerResumenDashboard(fecha) {
  const parametros = [fecha || null];

  // =====================================================
  // RESUMEN GENERAL DEL DÍA
  // =====================================================

  const resumen = await pool.query(
    `WITH parametros AS (
       SELECT COALESCE(
         $1::date,
         (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
       ) AS fecha
     ),

     rango AS (
       SELECT
         fecha,
         fecha::timestamp
           AT TIME ZONE 'America/Argentina/Buenos_Aires' AS desde,
         (fecha + 1)::timestamp
           AT TIME ZONE 'America/Argentina/Buenos_Aires' AS hasta
       FROM parametros
     )

     SELECT
       (SELECT fecha::text FROM parametros) AS fecha,

       COUNT(DISTINCT v.id)::int AS visitas,

       COUNT(vd.id)::int AS trabajos,

       COALESCE(SUM(vd.importe), 0) AS total_registrado,

       COALESCE(
         SUM(vd.importe) FILTER (
           WHERE vd.estado_pago = 'PAGADO'
         ), 0
       ) AS total_cobrado,

       COALESCE(
         SUM(vd.importe) FILTER (
           WHERE vd.estado_pago = 'PENDIENTE'
         ), 0
       ) AS total_pendiente

     FROM rango r

     LEFT JOIN visitas v
       ON v.fecha_hora >= r.desde
      AND v.fecha_hora < r.hasta

     LEFT JOIN visitas_detalle vd
       ON vd.id_visita = v.id`,
    parametros
  );

  // =====================================================
  // RESUMEN POR UBICACIÓN
  // Siempre devuelve GOMERIA y MOVIL.
  // Si no hay actividad, devuelve valores en cero.
  // =====================================================

  const ubicaciones = await pool.query(
    `WITH parametros AS (
       SELECT COALESCE(
         $1::date,
         (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
       ) AS fecha
     ),

     rango AS (
       SELECT
         fecha::timestamp
           AT TIME ZONE 'America/Argentina/Buenos_Aires' AS desde,
         (fecha + 1)::timestamp
           AT TIME ZONE 'America/Argentina/Buenos_Aires' AS hasta
       FROM parametros
     ),

     lista_ubicaciones AS (
       SELECT 'GOMERIA'::varchar AS ubicacion
       UNION ALL
       SELECT 'MOVIL'::varchar
     )

     SELECT
       lu.ubicacion,

       COUNT(DISTINCT v.id)::int AS visitas,

       COUNT(vd.id)::int AS trabajos,

       COALESCE(SUM(vd.importe), 0) AS total_registrado,

       COALESCE(
         SUM(vd.importe) FILTER (
           WHERE vd.estado_pago = 'PAGADO'
         ), 0
       ) AS total_cobrado,

       COALESCE(
         SUM(vd.importe) FILTER (
           WHERE vd.estado_pago = 'PENDIENTE'
         ), 0
       ) AS total_pendiente

     FROM lista_ubicaciones lu
     CROSS JOIN rango r

     LEFT JOIN visitas v
       ON v.ubicacion = lu.ubicacion
      AND v.fecha_hora >= r.desde
      AND v.fecha_hora < r.hasta

     LEFT JOIN visitas_detalle vd
       ON vd.id_visita = v.id

     GROUP BY lu.ubicacion
     ORDER BY lu.ubicacion`,
    parametros
  );

  // =====================================================
  // ACTIVIDAD POR USUARIO / OPERADOR
  // Incluye a la dueña si también registra trabajos.
  // Los usuarios sin actividad aparecen con valores cero.
  // =====================================================

  const operadores = await pool.query(
    `WITH parametros AS (
       SELECT COALESCE(
         $1::date,
         (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
       ) AS fecha
     ),

     rango AS (
       SELECT
         fecha::timestamp
           AT TIME ZONE 'America/Argentina/Buenos_Aires' AS desde,
         (fecha + 1)::timestamp
           AT TIME ZONE 'America/Argentina/Buenos_Aires' AS hasta
       FROM parametros
     )

     SELECT
       u.id AS id_usuario,
       u.nombre,
       u.usuario,
       u.rol,

       COUNT(DISTINCT v.id)::int AS visitas,

       COUNT(vd.id)::int AS trabajos,

       COALESCE(SUM(vd.importe), 0) AS total_registrado,

       COALESCE(
         SUM(vd.importe) FILTER (
           WHERE vd.estado_pago = 'PAGADO'
         ), 0
       ) AS total_cobrado,

       COALESCE(
         SUM(vd.importe) FILTER (
           WHERE vd.estado_pago = 'PENDIENTE'
         ), 0
       ) AS total_pendiente

     FROM usuarios u
     CROSS JOIN rango r

     LEFT JOIN visitas v
       ON v.id_usuario = u.id
      AND v.fecha_hora >= r.desde
      AND v.fecha_hora < r.hasta

     LEFT JOIN visitas_detalle vd
       ON vd.id_visita = v.id

     WHERE u.activo = TRUE
      AND u.rol IN (
        'ADMINISTRADOR',
        'OPERADOR'
      )

     GROUP BY
       u.id,
       u.nombre,
       u.usuario,
       u.rol

     ORDER BY u.nombre`,
    parametros
  );

  return {
    fecha: resumen.rows[0].fecha,
    resumen: resumen.rows[0],
    ubicaciones: ubicaciones.rows,
    operadores: operadores.rows
  };
}


module.exports = {
  obtenerTiposTrabajo,
  crearVisita,
  listarVisitas,
  obtenerResumenDashboard
};