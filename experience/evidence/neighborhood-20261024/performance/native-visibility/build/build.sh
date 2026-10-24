set -eu

display_build_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
display_deps="$display_build_root/deps"
export TMPDIR="$display_build_root/tmp"
export PYTHONDONTWRITEBYTECODE=1
export PYTHONPATH="$display_deps/usr/lib/python3/dist-packages"
export PATH="$display_deps/usr/bin:$PATH"
export PKG_CONFIG_LIBDIR="$display_deps/usr/lib/x86_64-linux-gnu/pkgconfig:$display_deps/usr/share/pkgconfig:/usr/lib/x86_64-linux-gnu/pkgconfig:/usr/share/pkgconfig"
export PKG_CONFIG_SYSROOT_DIR="$display_deps"
export LD_LIBRARY_PATH="$display_deps/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

test -w "$display_build_root/runtime/xkb"
test -x "$display_build_root/runtime/xkb"

# 构建产物、临时文件与 XKB 输出全部保存在任务目录；只编译原始 Xvfb 目标。
/usr/bin/python3 -m mesonbuild.mesonmain setup "$display_build_root/build" "$display_build_root/sources/xorg-server-21.1.16" \
  --prefix="$display_build_root/install" --libdir=lib --sysconfdir=etc --localstatedir=var \
  --buildtype=release --wrap-mode=nofallback \
  -Dxorg=false -Dxnest=false -Dxephyr=false -Dxvfb=true -Dxwin=false -Dxquartz=false \
  -Dglamor=false -Dglx=true -Dudev=false -Dudev_kms=false -Dhal=false -Dsystemd_logind=false \
  -Dxselinux=false -Ddocs=false -Ddevel-docs=false -Ddocs-pdf=false -Dmitshm=false \
  -Dlisten_tcp=true -Dlisten_unix=false -Dlisten_local=false -Dsha1=libcrypto \
  -Dxkb_dir=/usr/share/X11/xkb -Dxkb_bin_dir=/usr/bin \
  -Dxkb_output_dir="$display_build_root/runtime/xkb" \
  -Dlog_dir="$display_build_root/runtime/logs" -Ddefault_font_path=built-ins
ninja -C "$display_build_root/build" -j2 hw/vfb/Xvfb
/usr/bin/python3 -m mesonbuild.mesonmain introspect --buildoptions "$display_build_root/build" > "$display_build_root/build-options.json"
sha256sum "$display_build_root/build/hw/vfb/Xvfb" > "$display_build_root/xvfb.sha256"
ldd "$display_build_root/build/hw/vfb/Xvfb" > "$display_build_root/runtime-libraries.txt"
