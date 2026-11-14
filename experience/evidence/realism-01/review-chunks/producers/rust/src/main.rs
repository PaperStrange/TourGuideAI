use std::{collections::BTreeMap, fs, path::Path};
use anyhow::{ensure, Context, Result};
use serde_json::{json, Value};
use spark_lib::{
    decoder::{ChunkReceiver, SplatEncoding, SplatGetter},
    gsplat::GsplatArray,
    rad::{decode_rad_header, RadAlphaEncoding, RadCenterEncoding, RadDecoder, RadEncoder,
        RadOrientationEncoding, RadRgbEncoding, RadScalesEncoding, RadShEncoding},
};

fn decode(path: &Path) -> Result<(GsplatArray, Value)> {
    let header = fs::read(path)?;
    let (metadata, _) = decode_rad_header(&header)?.context("Complete RAD header required")?;
    let metadata = serde_json::to_value(metadata)?;
    let mut decoder = RadDecoder::new(GsplatArray::new());
    decoder.push(&header)?;
    for chunk in metadata["chunks"].as_array().context("RAD chunks required")? {
        let filename = chunk["filename"].as_str().context("External chunk filename required")?;
        ensure!(Path::new(filename).file_name().and_then(|name| name.to_str()) == Some(filename), "Local chunk filenames required");
        decoder.push(&fs::read(path.parent().unwrap().join(filename))?)?;
    }
    decoder.finish()?;
    Ok((decoder.into_splats(), metadata))
}

fn compare(left: &mut GsplatArray, right: &mut GsplatArray) -> Value {
    let count = left.num_splats();
    assert_eq!(count, right.num_splats());
    assert_eq!(left.max_sh_degree(), right.max_sh_degree());
    assert_eq!(left.has_lod_tree(), right.has_lod_tree());
    let mut differences = BTreeMap::new();
    macro_rules! compare_float {
        ($name:literal, $method:ident, $dimensions:literal) => {{
            let mut different = 0usize;
            let mut maximum_error = 0f32;
            for base in (0..count).step_by(65536) {
                let length = (count - base).min(65536);
                let mut a = vec![0f32; length * $dimensions];
                let mut b = vec![0f32; length * $dimensions];
                left.$method(base, length, &mut a);
                right.$method(base, length, &mut b);
                for (a, b) in a.iter().zip(b.iter()) {
                    if a.to_bits() != b.to_bits() {
                        different += 1;
                        maximum_error = maximum_error.max((a - b).abs());
                    }
                }
            }
            differences.insert($name, json!({"differentValues": different, "maximumAbsoluteError": maximum_error}));
        }};
    }
    compare_float!("center", get_center, 3);
    compare_float!("opacity", get_opacity, 1);
    compare_float!("rgb", get_rgb, 3);
    compare_float!("scale", get_scale, 3);
    compare_float!("quaternion", get_quat, 4);
    compare_float!("sh1", get_sh1, 9);
    compare_float!("sh2", get_sh2, 15);
    let mut child_count_a = vec![0u16; count];
    let mut child_count_b = vec![0u16; count];
    let mut child_start_a = vec![0usize; count];
    let mut child_start_b = vec![0usize; count];
    left.get_child_count(0, count, &mut child_count_a);
    right.get_child_count(0, count, &mut child_count_b);
    left.get_child_start(0, count, &mut child_start_a);
    right.get_child_start(0, count, &mut child_start_b);
    let child_count_changes = child_count_a.iter().zip(&child_count_b).filter(|(a,b)| a != b).count();
    let child_start_changes = child_start_a.iter().zip(&child_start_b).filter(|(a,b)| a != b).count();
    let identical = differences.values().all(|entry| entry["differentValues"] == 0)
        && child_count_changes == 0 && child_start_changes == 0;
    json!({"splatCount": count, "maxShDegree": left.max_sh_degree(),
        "floatingProperties": differences, "childCountChanges": child_count_changes,
        "childStartChanges": child_start_changes, "decodedIdentical": identical})
}

fn main() -> Result<()> {
    let arguments: Vec<String> = std::env::args().collect();
    ensure!(arguments.len() == 3, "Usage: review-rad-encoding INPUT.rad EMPTY_OUTPUT_DIRECTORY");
    let input = Path::new(&arguments[1]);
    let output = Path::new(&arguments[2]);
    ensure!(!output.exists(), "Output directory must be new");
    fs::create_dir_all(output)?;
    let (splats, metadata) = decode(input)?;
    ensure!(metadata["maxSh"] == 2 && metadata["chunkSize"] == 65536, "Expected approved SH2 / 65536-page input");
    let encoding: SplatEncoding = serde_json::from_value(metadata["splatEncoding"].clone())?;
    // 原始层次、索引和量化范围直接交给官方 RadEncoder。
    let mut encoder = RadEncoder::new(splats)
        .with_encoding(encoding)
        .with_center_encoding(RadCenterEncoding::F32LeBytes)
        .with_alpha_encoding(RadAlphaEncoding::F16)
        .with_rgb_encoding(RadRgbEncoding::R8Delta)
        .with_scales_encoding(RadScalesEncoding::Ln0R8)
        .with_orientation_encoding(RadOrientationEncoding::Oct88R8)
        .with_sh_encoding(RadShEncoding::S8Delta)
        .with_comment("Existing SH2 hierarchy re-encoded with official S8Delta; decoded equality reported separately".to_string());
    let output_header = output.join(input.file_name().unwrap());
    let mut header = fs::File::create(&output_header)?;
    let chunks = encoder.encode_with_chunks(&mut header, "knock-original-lod-")?;
    let mut sizes = Vec::new();
    for (filename, bytes) in chunks {
        fs::write(output.join(&filename), &bytes)?;
        sizes.push(json!({"filename": filename, "bytes": bytes.len()}));
    }
    drop(header);
    let (mut original, _) = decode(input)?;
    let (mut derivative, _) = decode(&output_header)?;
    let comparison = compare(&mut original, &mut derivative);
    let report = json!({"input": input, "output": output_header, "method": "Spark 2.4.0 official RadDecoder/RadEncoder S8Delta",
        "chunks": sizes, "comparison": comparison});
    fs::write(output.join("comparison.json"), serde_json::to_vec_pretty(&report)?)?;
    println!("{}", serde_json::to_string_pretty(&report)?);
    ensure!(report["comparison"]["decodedIdentical"] == true, "Decoded identity gate failed; output remains an unqualified experiment");
    Ok(())
}
