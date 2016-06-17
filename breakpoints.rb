require "bundler/setup"
require 'json'
require "sinatra"
require "logger"
require "cloudinary"


get '/' do
  cache_control :public, max_age: 3600
  File.read(File.join('public', 'index.html'))
end

get '/tos' do
  cache_control :public, max_age: 25200
  File.read(File.join('public', 'tos.html'))
end

post "/authenticate" do  
  content_type :json 
  aspect_ratios = params[:aspect_ratios]
  aspect_ratios = ["original"] if aspect_ratios.blank?
  screen_sizes = params[:screen_sizes] || []
  view_port_ratios = params[:view_port_ratios] || []
  breakpoints_settings = []
  retina = params[:retina].to_s == '1' 
   
  aspect_ratios.each_with_index do |aspect_ratio, index|
    settings = {}    
    settings[:create_derived] = true
    [:min_width, :max_width, :bytes_step, :max_images].each do |k|
      v = params[k]
      if v && v.is_a?(String) && v.match(/^\d+$/)
        settings[k] = v.to_i
      end
    end
    view_port_ratio = view_port_ratios[index] || 100
    if screen_sizes[index]
      min_width, max_width = screen_sizes[index].split(",").map{|size| (size.to_i * (view_port_ratio.to_i / 100.0)).ceil}
      settings[:min_width] = min_width.to_i > 0 ? min_width : settings[:min_width]
      settings[:max_width] = max_width.to_i > 0 ? [settings[:max_width], max_width].min : settings[:max_width]
    end 

    settings[:bytes_step] = settings[:bytes_step]*1024 if settings[:bytes_step]
    settings[:max_width] = settings[:max_width]*2 if retina
    
    settings[:transformation] = {:crop => :fill, :aspect_ratio => aspect_ratio, :gravity => :auto} if aspect_ratio != 'original'
    breakpoints_settings << settings
  end

  explicit_params = Cloudinary::Uploader.build_upload_params(type: :upload, responsive_breakpoints: breakpoints_settings)
  explicit_params[:public_id] = params[:public_id]
  explicit_params.reject!{|k, v| v.nil? || v=="" }

  {
    url: Cloudinary::Utils.cloudinary_api_url("explicit"),
    params: Cloudinary::Utils.sign_request(explicit_params)
  }.to_json
end

post "/zip_url" do
  breakpoints = JSON.parse(params[:breakpoints])
  transformations = []
  breakpoints.each do |breakpoints_info|
    breakpoints_info["breakpoints"].each do |breakpoint|
      if breakpoints_info["transformation"]
        transformations << {:transformation => [{:raw_transformation => breakpoints_info["transformation"]}, {crop: 'scale', width: breakpoint["width"]}]}
      else
        transformations << {crop: 'scale', width: breakpoint["width"]}
      end
    end
  end  
  content_type :json    
  {
    url: Cloudinary::Utils.download_zip_url(
      public_ids: [params[:public_id]],  
      flatten: true,     
      transformations: transformations)
  }.to_json
end
