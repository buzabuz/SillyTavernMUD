import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

struct IconRegion {
    let name: String
    let x: Int
    let y: Int
}

let arguments = CommandLine.arguments
guard arguments.count == 3 else {
    fputs("Usage: swift process_icons.swift <source.png> <output-directory>\n", stderr)
    exit(1)
}

let sourceURL = URL(fileURLWithPath: arguments[1])
let outputDirectory = URL(fileURLWithPath: arguments[2], isDirectory: true)

guard
    let source = CGImageSourceCreateWithURL(sourceURL as CFURL, nil),
    let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
else {
    fputs("Could not read source image.\n", stderr)
    exit(1)
}

let width = image.width
let height = image.height
guard width == 1024 && height == 1024 else {
    fputs("Expected a 1024x1024 icon sheet.\n", stderr)
    exit(1)
}

let bytesPerPixel = 4
let bytesPerRow = width * bytesPerPixel
var sourcePixels = [UInt8](repeating: 0, count: height * bytesPerRow)

guard let sourceContext = CGContext(
    data: &sourcePixels,
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: bytesPerRow,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
    fputs("Could not create source bitmap context.\n", stderr)
    exit(1)
}

sourceContext.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

let regions = [
    IconRegion(name: "icon-d20", x: 0, y: 0),
    IconRegion(name: "icon-wand", x: 512, y: 0),
    IconRegion(name: "icon-memory-vial", x: 0, y: 512),
    IconRegion(name: "icon-map", x: 512, y: 512),
]

try FileManager.default.createDirectory(
    at: outputDirectory,
    withIntermediateDirectories: true
)

for region in regions {
    let iconSize = 512
    let iconBytesPerRow = iconSize * bytesPerPixel
    var outputPixels = [UInt8](repeating: 0, count: iconSize * iconBytesPerRow)

    for y in 0..<iconSize {
        for x in 0..<iconSize {
            let sourceX = region.x + x
            let sourceY = region.y + y
            let sourceIndex = sourceY * bytesPerRow + sourceX * bytesPerPixel
            let outputIndex = y * iconBytesPerRow + x * bytesPerPixel

            let red = Int(sourcePixels[sourceIndex])
            let green = Int(sourcePixels[sourceIndex + 1])
            let blue = Int(sourcePixels[sourceIndex + 2])
            let greenExcess = green - max(red, blue)

            let alpha: Int
            if green > 70 && greenExcess >= 50 {
                alpha = 0
            } else if green > 55 && greenExcess > 18 {
                alpha = 255 - ((greenExcess - 18) * 255 / 32)
            } else {
                alpha = 255
            }

            let clampedAlpha = max(0, min(255, alpha))
            let cleanedGreen = greenExcess > 4 ? min(green, max(red, blue) + 3) : green

            outputPixels[outputIndex] = UInt8(red * clampedAlpha / 255)
            outputPixels[outputIndex + 1] = UInt8(cleanedGreen * clampedAlpha / 255)
            outputPixels[outputIndex + 2] = UInt8(blue * clampedAlpha / 255)
            outputPixels[outputIndex + 3] = UInt8(clampedAlpha)
        }
    }

    guard
        let outputContext = CGContext(
            data: &outputPixels,
            width: iconSize,
            height: iconSize,
            bitsPerComponent: 8,
            bytesPerRow: iconBytesPerRow,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ),
        let outputImage = outputContext.makeImage()
    else {
        fputs("Could not create output image for \(region.name).\n", stderr)
        exit(1)
    }

    let destinationURL = outputDirectory
        .appendingPathComponent(region.name)
        .appendingPathExtension("png")

    guard let destination = CGImageDestinationCreateWithURL(
        destinationURL as CFURL,
        UTType.png.identifier as CFString,
        1,
        nil
    ) else {
        fputs("Could not create destination for \(region.name).\n", stderr)
        exit(1)
    }

    CGImageDestinationAddImage(destination, outputImage, nil)
    guard CGImageDestinationFinalize(destination) else {
        fputs("Could not write \(region.name).\n", stderr)
        exit(1)
    }
}

print("Processed \(regions.count) icons.")
