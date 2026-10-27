import Foundation
import AVFoundation
import Vision
import CoreImage

// Pass 02 cut-out: writes one full-size 8-bit person matte per frame to
// stdout (raw gray). scripts/cutout.sh turns it into an alpha video.
let input = CommandLine.arguments[1]
let asset = AVURLAsset(url: URL(fileURLWithPath: input))
let track = asset.tracks(withMediaType: .video).first!
let width = Int(track.naturalSize.width), height = Int(track.naturalSize.height)
let reader = try AVAssetReader(asset: asset)
let stream = AVAssetReaderTrackOutput(track: track, outputSettings: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
])
reader.add(stream)
guard reader.startReading() else { fatalError("Cannot read \(input)") }
let context = CIContext(options: [.cacheIntermediates: false])
let request = VNGeneratePersonSegmentationRequest()
request.qualityLevel = .accurate
request.outputPixelFormat = kCVPixelFormatType_OneComponent8
let handler = VNSequenceRequestHandler()
let out = FileHandle.standardOutput
var count = 0
while let sample = stream.copyNextSampleBuffer() {
    try autoreleasepool {
        try handler.perform([request], on: CMSampleBufferGetImageBuffer(sample)!)
        guard let result = request.results?.first else { fatalError("Missing person matte") }
        let image = CIImage(cvPixelBuffer: result.pixelBuffer)
        let scaled = image.transformed(by: CGAffineTransform(
            scaleX: CGFloat(width) / image.extent.width, y: CGFloat(height) / image.extent.height))
        var gray = Data(count: width * height)
        gray.withUnsafeMutableBytes { bytes in
            context.render(scaled, toBitmap: bytes.baseAddress!, rowBytes: width,
                           bounds: CGRect(x: 0, y: 0, width: width, height: height),
                           format: .L8, colorSpace: CGColorSpaceCreateDeviceGray())
        }
        out.write(gray)
        count += 1
        if count % 150 == 0 { FileHandle.standardError.write("Matted \(count) frames\n".data(using: .utf8)!) }
    }
}
if reader.status == .failed { throw reader.error! }
FileHandle.standardError.write("Completed \(count) mattes\n".data(using: .utf8)!)
